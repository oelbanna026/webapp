import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, authHeaders } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import { useClub } from "../club/useClub";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Pitch } from "../components/squad/Pitch";
import { PlayerCard } from "../components/squad/PlayerCard";

const ALL_KEYS = [
  "GK",
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "RWB",
  "LDM",
  "CDM",
  "RDM",
  "LM",
  "LCM",
  "CM",
  "RCM",
  "RM",
  "LAM",
  "CAM",
  "RAM",
  "LW",
  "ST",
  "RW",
  "ST2",
];

const FORMATION_KEYS = {
  "4-3-3": ["GK", "LB", "LCB", "RCB", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"],
  "4-4-2": ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "RCM", "RM", "ST", "ST2"],
  "4-2-3-1": ["GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LAM", "CAM", "RAM", "ST"],
  "4-1-2-1-2": ["GK", "LB", "LCB", "RCB", "RB", "CDM", "LCM", "RCM", "CAM", "ST", "ST2"],
  "4-5-1": ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "CM", "RCM", "RM", "ST"],
  "3-4-3": ["GK", "LCB", "CB", "RCB", "LM", "LCM", "RCM", "RM", "LW", "ST", "RW"],
  "3-5-2": ["GK", "LCB", "CB", "RCB", "LM", "LCM", "CM", "RCM", "RM", "ST", "ST2"],
  "5-3-2": ["GK", "LWB", "LCB", "CB", "RCB", "RWB", "LCM", "CM", "RCM", "ST", "ST2"],
};

const DEF_KEYS = new Set(["GK", "LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"]);
const ATT_KEYS = new Set(["LW", "RW", "ST", "ST2"]);

function getLineKeys(activeKeys) {
  const defense = [];
  const midfield = [];
  const attack = [];
  for (const k of activeKeys) {
    if (DEF_KEYS.has(k)) defense.push(k);
    else if (ATT_KEYS.has(k)) attack.push(k);
    else midfield.push(k);
  }
  return { attack, midfield, defense };
}

function emptySlots() {
  const s = {};
  for (const k of ALL_KEYS) s[k] = null;
  return s;
}

function calcTeamRating(keys, slots, playersById) {
  const ids = keys.map((k) => slots[k]).filter(Boolean);
  const players = ids.map((id) => playersById[id]).filter(Boolean);
  if (players.length === 0) return 0;
  const sum = players.reduce((acc, p) => acc + p.rating, 0);
  return Math.round(sum / players.length);
}

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function avg(values) {
  const list = values.filter((v) => Number.isFinite(v));
  if (list.length === 0) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function playerLineScore(player, line) {
  const s = player.stats || {};
  const pace = clampScore(s.pace);
  const shooting = clampScore(s.shooting);
  const passing = clampScore(s.passing);
  const defense = clampScore(s.defense);
  if (line === "attack") return clampScore(shooting * 0.6 + pace * 0.4);
  if (line === "midfield") return clampScore(passing * 0.6 + pace * 0.2 + shooting * 0.2);
  return clampScore(defense * 0.7 + pace * 0.3);
}

function computeChemistry(players) {
  const list = (players || []).filter(Boolean);
  const n = list.length;
  if (n < 2) return { chemistryScore: 0, chemistryBonus: 0 };

  let score = 0;
  let max = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = list[i];
      const b = list[j];
      max += 3;
      if (a.clubName && b.clubName && a.clubName === b.clubName) score += 2;
      if (a.nation && b.nation && a.nation === b.nation) score += 1;
    }
  }
  const chemistryScore = max > 0 ? Math.round((score / max) * 100) : 0;
  const chemistryBonus = Math.round((chemistryScore / 100) * 6);
  return { chemistryScore, chemistryBonus };
}

function parseDragPayload(e) {
  const raw = e.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function SquadBuilder() {
  const { token } = useAuth();
  const { club } = useClub();

  const [players, setPlayers] = useState([]);
  const [slots, setSlots] = useState(emptySlots);
  const [formation, setFormation] = useState("4-3-3");
  const [serverRating, setServerRating] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [overKey, setOverKey] = useState(null);

  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const activeKeys = useMemo(() => FORMATION_KEYS[formation] || FORMATION_KEYS["4-3-3"], [formation]);
  const lineKeys = useMemo(() => getLineKeys(activeKeys), [activeKeys]);
  const assignedIds = useMemo(() => new Set(activeKeys.map((k) => slots[k]).filter(Boolean)), [activeKeys, slots]);
  const benchPlayers = useMemo(() => players.filter((p) => !assignedIds.has(p.id)), [players, assignedIds]);
  const rating = useMemo(() => calcTeamRating(activeKeys, slots, playersById), [activeKeys, slots, playersById]);

  const coachBonus = useMemo(() => {
    const c = club?.coach;
    if (!c) return 0;
    return (c.bonusAttack || 0) + (c.bonusDefense || 0) + (c.bonusAll || 0);
  }, [club?.coach]);

  const powerBreakdown = useMemo(() => {
    const attack = avg(lineKeys.attack.map((k) => (slots[k] && playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "attack") : null)));
    const midfield = avg(
      lineKeys.midfield.map((k) => (slots[k] && playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "midfield") : null))
    );
    const defense = avg(lineKeys.defense.map((k) => (slots[k] && playersById[slots[k]] ? playerLineScore(playersById[slots[k]], "defense") : null)));
    const assignedPlayers = activeKeys.map((k) => (slots[k] ? playersById[slots[k]] : null)).filter(Boolean);
    const { chemistryScore, chemistryBonus } = computeChemistry(assignedPlayers);
    const teamPower = Math.round(attack + midfield + defense + coachBonus + chemistryBonus);
    return { attack: Math.round(attack), midfield: Math.round(midfield), defense: Math.round(defense), chemistryScore, chemistryBonus, teamPower };
  }, [activeKeys, coachBonus, lineKeys.attack, lineKeys.defense, lineKeys.midfield, playersById, slots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [playersData, squadData] = await Promise.all([
          apiRequest("/api/players", { headers: authHeaders(token) }),
          apiRequest("/api/squad", { headers: authHeaders(token) }),
        ]);

        if (cancelled) return;
        setPlayers(playersData.players);

        if (squadData.squad?.slots) {
          const next = emptySlots();
          for (const k of ALL_KEYS) {
            next[k] = squadData.squad.slots[k]?.id || null;
          }
          setSlots(next);
          setFormation(squadData.squad.formation || "4-3-3");
          setServerRating(squadData.squad.rating ?? null);
        } else {
          setSlots(emptySlots());
          setFormation("4-3-3");
          setServerRating(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load squad");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const switchFormation = useCallback((nextFormation) => {
    setFormation(nextFormation);
    const keys = FORMATION_KEYS[nextFormation] || FORMATION_KEYS["4-3-3"];
    setSlots((prev) => {
      const next = emptySlots();
      for (const k of keys) next[k] = prev[k] || null;
      return next;
    });
  }, []);

  function onDragStartFromBench(playerId, e) {
    e.dataTransfer.setData("application/json", JSON.stringify({ playerId, from: { type: "bench" } }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragStartFromSlot(fromKey, e) {
    const playerId = slots[fromKey];
    if (!playerId) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ playerId, from: { type: "slot", key: fromKey } }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropToSlot(toKey, e) {
    const payload = parseDragPayload(e);
    if (!payload?.playerId) return;

    setSlots((prev) => {
      const next = { ...prev };
      const incomingId = payload.playerId;

      if (payload.from?.type === "slot" && payload.from.key && payload.from.key !== toKey) {
        const fromKey = payload.from.key;
        const toPrev = next[toKey];
        next[toKey] = incomingId;
        next[fromKey] = toPrev || null;
        return next;
      }

      next[toKey] = incomingId;
      return next;
    });
  }

  function clearSlot(key) {
    setSlots((prev) => ({ ...prev, [key]: null }));
  }

  function onDropToBench(e) {
    const payload = parseDragPayload(e);
    if (payload?.from?.type === "slot" && payload.from.key) {
      clearSlot(payload.from.key);
    }
  }

  async function saveSquad() {
    setIsSaving(true);
    setError(null);
    try {
      const data = await apiRequest("/api/squad", {
        method: "PUT",
        headers: authHeaders(token),
        json: { formation, slots },
      });
      setServerRating(data.squad?.rating ?? null);
    } catch (err) {
      setError(err.message || "Failed to save squad");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="glass-card rounded-xl p-6 flex items-center justify-between">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Squad Builder</h1>
              <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Drag & drop players into a formation
              </div>
              <div className="mt-4 flex items-center gap-2">
                {["4-3-3", "4-4-2", "4-2-3-1", "4-1-2-1-2", "4-5-1", "3-4-3", "3-5-2", "5-3-2"].map((f) => (
                  <Button key={f} variant={formation === f ? "primary" : "ghost"} onClick={() => switchFormation(f)}>
                    {f}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-3 rounded-xl border border-outline-variant/20 bg-surface-container-highest/60">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Team Rating</div>
                <div className="mt-1 font-headline font-black text-3xl text-primary tracking-tighter">{rating}</div>
                {serverRating === null ? null : (
                  <div className="mt-1 text-[10px] text-on-surface-variant">Saved: {serverRating}</div>
                )}
              </div>
              <div className="px-4 py-3 rounded-xl border border-outline-variant/20 bg-surface-container-highest/60">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Team Power</div>
                <div className="mt-1 font-headline font-black text-3xl text-secondary tracking-tighter">
                  {powerBreakdown.teamPower}
                </div>
                <div className="mt-1 text-[10px] text-on-surface-variant">
                  A {powerBreakdown.attack} • M {powerBreakdown.midfield} • D {powerBreakdown.defense} • +{coachBonus} • Chem +{powerBreakdown.chemistryBonus} ({powerBreakdown.chemistryScore}%)
                </div>
              </div>
              <Button onClick={saveSquad} disabled={isSaving || isLoading} className="neon-glow-primary px-6 py-4 text-xs">
                <Icon name="save" className="text-sm" />
                {isSaving ? "Saving…" : "Save Squad"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <Pitch
            formation={formation}
            slots={slots}
            playersById={playersById}
            onDropPlayer={onDropToSlot}
            onClearSlot={clearSlot}
            onDragStartFromSlot={onDragStartFromSlot}
            overKey={overKey}
            setOverKey={setOverKey}
          />
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <section
            className="glass-card rounded-xl p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onDropToBench(e);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-black text-lg tracking-tight uppercase">Bench</h2>
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Drop here to remove from pitch
                </p>
              </div>
              <div className="bg-surface-bright text-on-surface px-3 py-1 rounded font-headline font-black text-sm">
                {benchPlayers.length}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              {isLoading ? (
                <div className="text-sm text-on-surface-variant">Loading players…</div>
              ) : benchPlayers.length === 0 ? (
                <div className="text-sm text-on-surface-variant">All players are assigned.</div>
              ) : (
                benchPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    draggable
                    onDragStart={(e) => onDragStartFromBench(player.id, e)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="glass-card rounded-xl p-6">
            <h2 className="font-headline font-black text-lg tracking-tight uppercase">Rules</h2>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-primary text-sm" />
                One player per position
              </div>
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-primary text-sm" />
                No duplicate players
              </div>
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-primary text-sm" />
                Rating = average of assigned players
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

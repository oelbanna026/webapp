import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { PlayerCard } from "../components/squad/PlayerCard";

const STAT_KEYS = [
  { key: "pace", label: "Pace" },
  { key: "shooting", label: "Shooting" },
  { key: "passing", label: "Passing" },
  { key: "defense", label: "Defense" },
];

const UPGRADE_CAP_POINTS = {
  common: 10,
  rare: 20,
  epic: 30,
  legendary: 40,
};

const STAT_POINTS_PER_LEVEL = {
  common: 1,
  rare: 1,
  epic: 2,
  legendary: 3,
};

function recalcRating(stats) {
  const s = stats || {};
  const pace = Number(s.pace) || 0;
  const shooting = Number(s.shooting) || 0;
  const passing = Number(s.passing) || 0;
  const defense = Number(s.defense) || 0;
  return Math.round((pace + shooting + passing + defense) / 4);
}

function upgradeCost(player) {
  const base =
    player.rarity === "legendary"
      ? 3500
      : player.rarity === "epic"
        ? 2200
        : player.rarity === "rare"
          ? 1400
          : 900;
  return base + (player.level ?? 1) * 120;
}

function levelUpThreshold(level) {
  return 200 + level * 60;
}

export function PlayerUpgrades() {
  const { token, user, refreshMe } = useAuth();
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mine = await apiRequest("/api/players?scope=mine", { headers: authHeaders(token) });
      setPlayers(mine.players || []);
    } catch (err) {
      setError(err.message || "Failed to load players");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlayer = useMemo(() => players.find((p) => p.id === selected) || null, [players, selected]);
  const cap = useMemo(() => (selectedPlayer ? UPGRADE_CAP_POINTS[selectedPlayer.rarity] || 10 : 0), [selectedPlayer]);
  const spent = useMemo(() => (selectedPlayer ? selectedPlayer.upgradeSpent ?? 0 : 0), [selectedPlayer]);
  const perPointCost = useMemo(() => (selectedPlayer ? upgradeCost(selectedPlayer) : 0), [selectedPlayer]);
  const nextLevelNeed = useMemo(
    () => (selectedPlayer ? levelUpThreshold(selectedPlayer.level ?? 1) : 0),
    [selectedPlayer]
  );
  const xpProgress = useMemo(() => {
    if (!selectedPlayer) return 0;
    const need = nextLevelNeed || 1;
    const cur = Number(selectedPlayer.xp) || 0;
    return Math.max(0, Math.min(1, cur / need));
  }, [nextLevelNeed, selectedPlayer]);

  const pendingPreview = useMemo(() => {
    if (!selectedPlayer || !pending?.stat) return null;
    const stat = pending.stat;
    const desired = pending.amount || 1;
    const currentStat = selectedPlayer.stats?.[stat] ?? 0;
    const remainingCap = Math.max(0, cap - (selectedPlayer.upgradeSpent ?? 0));
    const remainingStat = Math.max(0, 99 - currentStat);
    const remainingPoints = Math.max(0, selectedPlayer.statPoints ?? 0);
    const applied = Math.max(0, Math.min(desired, remainingCap, remainingStat, remainingPoints));
    const totalCost = perPointCost * applied;
    const nextStat = Math.min(99, currentStat + applied);
    const nextRating = recalcRating({ ...selectedPlayer.stats, [stat]: nextStat });
    const canAfford = (user?.coins ?? 0) >= totalCost;
    return { stat, desired, applied, totalCost, currentStat, nextStat, nextRating, canAfford, remainingCap, remainingPoints };
  }, [cap, pending, perPointCost, selectedPlayer, user?.coins]);

  async function upgrade(stat, amount) {
    if (!selectedPlayer) return;
    setIsUpgrading(true);
    setError(null);
    try {
      const out = await apiRequest(`/api/players/${selectedPlayer.id}/upgrade`, {
        method: "POST",
        headers: authHeaders(token),
        json: { stat, amount },
      });
      setPlayers((prev) => prev.map((p) => (p.id === out.player.id ? out.player : p)));
      await refreshMe();
    } catch (err) {
      setError(err.message || "Upgrade failed");
    } finally {
      setIsUpgrading(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <div className="glass-card rounded-xl p-6 flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Upgrade Team</h1>
              <div className="mt-2 text-sm text-on-surface-variant">Spend coins to convert player stat points into stats.</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
                <Icon name="monetization_on" className="text-secondary text-sm" />
                <span className="font-headline font-bold text-sm tracking-tight">{user?.coins?.toLocaleString?.() ?? "—"}</span>
              </div>
              <Button onClick={load} disabled={isLoading} className="px-5 py-4 text-xs">
                <Icon name="refresh" className="text-sm" />
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <div className="glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <section className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-black text-lg tracking-tight uppercase">My Players</h2>
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                {players.length}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="text-sm text-on-surface-variant">Loading…</div>
              ) : (
                players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.id)}
                    className={`text-left transition-all ${selected === p.id ? "ring-2 ring-primary/40 rounded-xl" : ""}`}
                  >
                    <PlayerCard player={p} compact />
                    <div className="mt-2 flex items-center justify-between text-[10px] text-on-surface-variant">
                      <span>Lvl {p.level ?? 1}</span>
                      <span>SP {p.statPoints ?? 0}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-8">
          <section className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-black text-lg tracking-tight uppercase">Selected</h2>
              {selectedPlayer ? (
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Lvl {selectedPlayer.level ?? 1} • SP {selectedPlayer.statPoints ?? 0}
                </div>
              ) : null}
            </div>

            {selectedPlayer ? (
              <div className="mt-6">
                <PlayerCard player={selectedPlayer} />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                      XP
                    </div>
                    <div className="mt-1 font-headline font-black text-primary text-xl">{selectedPlayer.xp ?? 0}</div>
                    <div className="mt-2 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.round(xpProgress * 100)}%` }} />
                    </div>
                    <div className="mt-2 text-[10px] text-on-surface-variant">Next {nextLevelNeed}</div>
                  </div>
                  <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                      Cap
                    </div>
                    <div className="mt-1 font-headline font-black text-on-surface text-xl">
                      {spent}/{cap}
                    </div>
                    <div className="mt-2 text-[10px] text-on-surface-variant">Rarity cap</div>
                  </div>
                  <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">
                      Cost
                    </div>
                    <div className="mt-1 font-headline font-black text-secondary text-xl">{perPointCost.toLocaleString?.()}</div>
                    <div className="mt-2 text-[10px] text-on-surface-variant">per +1 stat</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Upgrade Amount
                  </div>
                  <Button variant={multiplier === 1 ? "primary" : "ghost"} onClick={() => setMultiplier(1)} disabled={isUpgrading}>
                    x1
                  </Button>
                  <Button variant={multiplier === 5 ? "primary" : "ghost"} onClick={() => setMultiplier(5)} disabled={isUpgrading}>
                    x5
                  </Button>
                  <Button variant={multiplier === 10 ? "primary" : "ghost"} onClick={() => setMultiplier(10)} disabled={isUpgrading}>
                    x10
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {STAT_KEYS.map((s) => (
                    (() => {
                      const currentStat = selectedPlayer.stats?.[s.key] ?? 0;
                      const remainingCap = Math.max(0, cap - (selectedPlayer.upgradeSpent ?? 0));
                      const remainingStat = Math.max(0, 99 - currentStat);
                      const remainingPoints = Math.max(0, selectedPlayer.statPoints ?? 0);
                      const applied = Math.max(0, Math.min(multiplier, remainingCap, remainingStat, remainingPoints));
                      const totalCost = perPointCost * applied;
                      const nextStat = Math.min(99, currentStat + applied);
                      const nextRating = recalcRating({ ...selectedPlayer.stats, [s.key]: nextStat });
                      const canSpend = applied > 0 && (user?.coins ?? 0) >= totalCost;
                      return (
                    <Button
                      key={s.key}
                      onClick={() => setPending({ stat: s.key, amount: multiplier })}
                      disabled={isUpgrading || !canSpend}
                      variant="ghost"
                      className="px-5 py-4 text-xs justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name="upgrade" className="text-sm" />
                        +{applied} {s.label}
                      </span>
                      <span className="text-on-surface-variant">
                        {currentStat}→{nextStat} • {nextRating} • {totalCost.toLocaleString?.()}
                      </span>
                    </Button>
                      );
                    })()
                  ))}
                </div>
                <div className="mt-4 text-[10px] text-on-surface-variant">
                  Stat points are earned when the player levels up. Rarity affects stat points per level (Common {STAT_POINTS_PER_LEVEL.common} • Rare {STAT_POINTS_PER_LEVEL.rare} • Epic {STAT_POINTS_PER_LEVEL.epic} • Legendary {STAT_POINTS_PER_LEVEL.legendary}).
                </div>
              </div>
            ) : (
              <div className="mt-6 text-sm text-on-surface-variant">Select a player to upgrade.</div>
            )}
          </section>
        </div>
      </div>

      {pendingPreview ? (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/65" onClick={() => (isUpgrading ? null : setPending(null))} />
          <div className="fixed inset-0 grid place-items-center p-6">
            <div className="glass-card rounded-2xl p-6 w-full max-w-lg border border-outline-variant/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Confirm Upgrade
                  </div>
                  <div className="mt-2 font-headline font-black text-xl tracking-tight">
                    {pendingPreview.stat.toUpperCase()} +{pendingPreview.applied}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => (isUpgrading ? null : setPending(null))}
                  className="p-2 text-[#f1f3fc]/60 hover:text-primary hover:bg-[#20262f]/50 transition-all active:scale-95"
                >
                  <Icon name="close" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Stat</div>
                  <div className="mt-2 font-headline font-black text-on-surface">
                    {pendingPreview.currentStat} → {pendingPreview.nextStat}
                  </div>
                </div>
                <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Rating</div>
                  <div className="mt-2 font-headline font-black text-primary">{pendingPreview.nextRating}</div>
                </div>
                <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Cost</div>
                  <div className="mt-2 font-headline font-black text-secondary">
                    {pendingPreview.totalCost.toLocaleString?.()}
                  </div>
                  <div className="mt-1 text-[10px] text-on-surface-variant">
                    Coins after: {(Math.max(0, (user?.coins ?? 0) - pendingPreview.totalCost)).toLocaleString?.()}
                  </div>
                </div>
                <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Limits</div>
                  <div className="mt-2 text-sm text-on-surface-variant">
                    SP: {pendingPreview.remainingPoints} • Cap: {pendingPreview.remainingCap}
                  </div>
                  <div className="mt-1 text-[10px] text-on-surface-variant">
                    Requested: {pendingPreview.desired} • Applied: {pendingPreview.applied}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setPending(null)} disabled={isUpgrading}>
                  Cancel
                </Button>
                <Button
                  className="neon-glow-primary"
                  disabled={isUpgrading || pendingPreview.applied <= 0 || !pendingPreview.canAfford}
                  onClick={async () => {
                    await upgrade(pendingPreview.stat, pendingPreview.desired);
                    setPending(null);
                  }}
                >
                  {isUpgrading ? "Upgrading…" : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { Icon } from "../components/Icon";
import { Button } from "../components/Button";

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.floor(Number(n) || 0)));
const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-2-1-2", "4-5-1", "3-4-3", "3-5-2", "5-3-2"];

function getWsBase() {
  const base = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || "http://localhost:4000";
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString().replace(/\/$/, "");
}

function formatClock(seconds) {
  const s = clampInt(seconds, 0, 99 * 60 + 59);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function choosePossession({ pressing, lineHeight, counter }) {
  const p = clampInt(pressing, 0, 100);
  const l = clampInt(lineHeight, 0, 100);
  const base = 48 + Math.round((p - 50) * 0.12) + Math.round((l - 50) * 0.08) - (counter ? 4 : 0);
  return clampInt(base, 35, 65);
}

function SquadChip({ player, onSwap }) {
  return (
    <div className="flex-shrink-0 h-14 w-48 glass-panel rounded p-2 flex items-center gap-3 border border-white/5 relative overflow-hidden group">
      <div className="w-10 h-10 rounded bg-surface-container-highest/70 border border-outline-variant/15 grid place-items-center font-headline font-black text-primary">
        {String(player?.rating ?? "—")}
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-[10px] font-headline font-black text-on-surface uppercase truncate">{player?.name ?? "—"}</p>
        <div className="mt-1 w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-secondary rounded-full" style={{ width: `${clampInt(player?.stamina ?? 80, 0, 100)}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={onSwap}
        className="absolute inset-y-0 right-0 w-8 bg-primary/0 group-hover:bg-primary/20 flex items-center justify-center transition-all"
      >
        <span className="material-symbols-outlined text-primary text-sm opacity-0 group-hover:opacity-100">swap_horiz</span>
      </button>
    </div>
  );
}

export function LiveStrategyConsole() {
  const { token, user, refreshMe } = useAuth();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [isQueued, setIsQueued] = useState(false);
  const [formation, setFormation] = useState("4-3-3");
  const [mentality, setMentality] = useState("balanced");
  const [pressing, setPressing] = useState(82);
  const [lineHeight, setLineHeight] = useState(65);
  const [counterAttack, setCounterAttack] = useState(true);
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [selectedBenchId, setSelectedBenchId] = useState(null);
  const wsRef = useRef(null);

  const mySide = useMemo(() => {
    const me = user?.id;
    if (!me || !match?.teams) return "home";
    return String(match.teams.home.userId) === String(me) ? "home" : "away";
  }, [match?.teams, user?.id]);

  const score = useMemo(() => ({ home: match?.score?.home ?? 0, away: match?.score?.away ?? 0 }), [match?.score?.away, match?.score?.home]);

  const possessionPct = useMemo(() => {
    if (!match?.ball) return choosePossession({ pressing, lineHeight, counter: counterAttack });
    const ballBias = clampInt(50 + Math.round((match.ball.x - 0.5) * 28), 35, 65);
    if (match.possession === "home") return clampInt(ballBias + 4, 35, 65);
    return clampInt(ballBias - 4, 35, 65);
  }, [counterAttack, lineHeight, match?.ball, match?.possession, pressing]);

  const timeLabel = useMemo(() => {
    const t = clampInt(match?.timeSec ?? 0, 0, 90);
    return formatClock(t * 60);
  }, [match?.timeSec]);

  const send = useCallback(
    (message) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(message));
    },
    [wsRef]
  );

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${getWsBase()}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    const t = setTimeout(() => setWsStatus("connecting"), 0);

    ws.onopen = () => {
      setWsStatus("connected");
    };
    ws.onclose = () => {
      setWsStatus("disconnected");
      setIsQueued(false);
    };
    ws.onerror = () => {
      setWsStatus("error");
    };
    ws.onmessage = (ev) => {
      let msg = null;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "match.queued") {
        setIsQueued(true);
      } else if (msg.type === "match.start") {
        setError(null);
        setIsQueued(false);
        setMatch(msg.match);
      } else if (msg.type === "match.tick") {
        setMatch(msg.match);
      } else if (msg.type === "match.end") {
        setMatch(msg.match);
        refreshMe();
      } else if (msg.type === "match.error") {
        setError(msg.message || "Match error");
        setIsQueued(false);
      }
    };

    return () => {
      clearTimeout(t);
      ws.close();
    };
  }, [refreshMe, token]);

  const loadSquad = useCallback(async () => {
    try {
      const data = await apiRequest("/api/squad", { headers: authHeaders(token) });
      const players = Object.values(data?.squad?.playersById || {});
      const withFitness = players.map((p, idx) => ({
        ...p,
        stamina: 92 - idx * 7,
      }));
      setSquadPlayers(withFitness.slice(0, 6));
    } catch {
      setSquadPlayers([]);
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => loadSquad(), 0);
    return () => clearTimeout(t);
  }, [loadSquad]);

  useEffect(() => {
    if (!match || wsStatus !== "connected") return;
    const t = setTimeout(() => {
      send({
        type: "match.tactics",
        tactics: { formation, playstyle: mentality, pressing, lineHeight, counter: counterAttack },
      });
    }, 160);
    return () => clearTimeout(t);
  }, [counterAttack, formation, lineHeight, match, mentality, pressing, send, wsStatus]);

  const start = useCallback(() => {
    setError(null);
    setMatch(null);
    setIsQueued(true);
    send({ type: "match.queue" });
  }, [send]);

  const leave = useCallback(() => {
    setError(null);
    setIsQueued(false);
    send({ type: "match.leave" });
    setMatch(null);
  }, [send]);

  const applyPreset = useCallback(
    (preset) => {
      if (preset === "press") {
        setMentality("balanced");
        setPressing(92);
        setLineHeight(72);
        setCounterAttack(false);
      } else if (preset === "attack") {
        setMentality("attacking");
        setPressing(78);
        setLineHeight(78);
        setCounterAttack(false);
      } else if (preset === "bus") {
        setMentality("defensive");
        setPressing(58);
        setLineHeight(42);
        setCounterAttack(true);
      }
    },
    [setCounterAttack, setLineHeight, setMentality, setPressing]
  );

  const homeName = match?.teams?.home?.clubName || "HOME";
  const awayName = match?.teams?.away?.clubName || "AWAY";
  const myBench = useMemo(() => {
    if (!match?.bench) return [];
    return mySide === "home" ? match.bench.home : match.bench.away;
  }, [match, mySide]);
  const myLineup = useMemo(() => {
    if (!match?.lineup) return [];
    return mySide === "home" ? match.lineup.home : match.lineup.away;
  }, [match, mySide]);
  const selectedBench = useMemo(() => myBench.find((p) => p.id === selectedBenchId) || null, [myBench, selectedBenchId]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-hidden">
      <header className="fixed top-0 w-full z-50 bg-[#0a0e14]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_20px_40px_rgba(0,227,253,0.08)] flex justify-between items-center h-16 px-6">
        <Link to="/" className="text-2xl font-black tracking-tighter text-primary font-headline uppercase">
          STADIUM_OS
        </Link>
        <nav className="hidden md:flex items-center gap-8 h-full">
          <Link
            className="text-primary font-bold border-b-2 border-primary h-full flex items-center px-2 font-headline uppercase text-xs tracking-tight hover:text-primary/80 hover:bg-white/5 transition-all"
            to="/live"
          >
            Analysis
          </Link>
          <Link className="text-on-surface-variant h-full flex items-center px-2 font-headline uppercase text-xs tracking-tight hover:text-primary hover:bg-white/5 transition-all" to="/squad">
            Squad
          </Link>
          <Link className="text-on-surface-variant h-full flex items-center px-2 font-headline uppercase text-xs tracking-tight hover:text-primary hover:bg-white/5 transition-all" to="/market">
            Market
          </Link>
          <Link className="text-on-surface-variant h-full flex items-center px-2 font-headline uppercase text-xs tracking-tight hover:text-primary hover:bg-white/5 transition-all" to="/missions">
            Logs
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button onClick={start} disabled={wsStatus !== "connected" || isQueued || !!match} className="px-5 py-3 text-xs neon-glow-primary">
            <Icon name="sports_soccer" className="text-sm" filled />
            {isQueued ? "Queued…" : match ? "Live" : "Play"}
          </Button>
          <Button onClick={leave} disabled={!isQueued && !match} variant="ghost" className="px-5 py-3 text-xs">
            <Icon name="logout" className="text-sm" />
            Leave
          </Button>
        </div>
      </header>

      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 md:w-64 z-40 bg-[#0f141a]/90 backdrop-blur-lg border-r border-white/5 flex flex-col py-6 overflow-y-auto no-scrollbar">
        <div className="px-6 mb-8">
          <h2 className="text-primary font-black font-headline text-lg tracking-tight">STRATEGY CONSOLE</h2>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Live Match Engine</p>
        </div>
        <div className="px-4 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest px-2">Formation</label>
            <select
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="w-full py-2 px-3 text-xs font-bold uppercase font-headline rounded bg-white/5 text-on-surface border border-white/10 focus:outline-none focus:border-primary/40"
            >
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest px-2">Mentality</label>
            <button
              type="button"
              onClick={() => setMentality("attacking")}
              className={`w-full py-2 px-4 text-left text-xs font-bold uppercase font-headline rounded transition-all ${
                mentality === "attacking" ? "bg-primary/10 text-primary border-l-4 border-primary" : "bg-white/5 text-on-surface-variant hover:bg-white/10"
              }`}
            >
              Attacking
            </button>
            <button
              type="button"
              onClick={() => setMentality("balanced")}
              className={`w-full py-2 px-4 text-left text-xs font-bold uppercase font-headline rounded transition-all ${
                mentality === "balanced" ? "bg-primary/10 text-primary border-l-4 border-primary" : "bg-white/5 text-on-surface-variant hover:bg-white/10"
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => setMentality("defensive")}
              className={`w-full py-2 px-4 text-left text-xs font-bold uppercase font-headline rounded transition-all ${
                mentality === "defensive" ? "bg-primary/10 text-primary border-l-4 border-primary" : "bg-white/5 text-on-surface-variant hover:bg-white/10"
              }`}
            >
              Defensive
            </button>
          </div>

          <div className="flex flex-col gap-4 px-2">
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Pressing Intensity</label>
                <span className="text-primary font-headline text-[10px] font-bold">{pressing}%</span>
              </div>
              <input
                className="w-full h-1 bg-surface-container-highest appearance-none rounded-full accent-primary cursor-pointer"
                type="range"
                min="0"
                max="100"
                value={pressing}
                onChange={(e) => setPressing(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Line Height</label>
                <span className="text-primary font-headline text-[10px] font-bold">{lineHeight}%</span>
              </div>
              <input
                className="w-full h-1 bg-surface-container-highest appearance-none rounded-full accent-primary cursor-pointer"
                type="range"
                min="0"
                max="100"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="px-2 flex items-center justify-between">
            <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Counter Attack</label>
            <button
              type="button"
              onClick={() => setCounterAttack((v) => !v)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${counterAttack ? "bg-secondary" : "bg-surface-container-highest"}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-on-secondary transition ${counterAttack ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-20 md:ml-64 mt-16 p-6 h-[calc(100vh-4rem-5rem)] relative overflow-hidden bg-surface-container-low">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center w-full max-w-2xl px-4">
          <div className="glass-panel px-10 py-3 rounded-xl flex items-center gap-12 justify-center shadow-2xl border border-white/10">
            <div className="flex flex-col items-center">
              <span className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-widest mb-1">{homeName}</span>
              <span className="text-4xl font-headline font-black text-on-surface">{score.home}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary-container/20 px-3 py-1 rounded-sm border border-primary-container/30 mb-1">
                <span className="text-primary font-headline font-bold text-sm tracking-tighter">{timeLabel}</span>
              </div>
              <span className="text-on-surface-variant font-headline text-[10px] font-bold uppercase tracking-[0.2em]">
                {match ? "Live Match" : isQueued ? "Matching" : "Ready"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-headline font-bold text-on-surface-variant uppercase tracking-widest mb-1">{awayName}</span>
              <span className="text-4xl font-headline font-black text-on-surface">{score.away}</span>
            </div>
          </div>
          <div className="mt-4 w-64 h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
            <div className="h-full bg-primary" style={{ width: `${possessionPct}%` }} />
            <div className="h-full bg-outline-variant" style={{ width: `${100 - possessionPct}%` }} />
          </div>
          <div className="flex justify-between w-64 mt-1 px-1">
            <span className="text-[9px] font-headline font-bold text-primary uppercase">Possession {possessionPct}%</span>
            <span className="text-[9px] font-headline font-bold text-on-surface-variant uppercase">{100 - possessionPct}%</span>
          </div>
        </div>

        {error ? (
          <div className="absolute top-[132px] left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
            <div className="glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          </div>
        ) : null}

        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <div className="w-[120%] h-[120%] rounded-[2rem] bg-[#1a2d21] border-[12px] border-white/5 relative perspective-pitch shadow-inner pitch-grid">
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-white/10 rounded-full" />
            <div className="absolute inset-y-1/4 left-0 w-16 h-1/2 border-4 border-l-0 border-white/10" />
            <div className="absolute inset-y-1/4 right-0 w-16 h-1/2 border-4 border-r-0 border-white/10" />

            {match?.positions?.home?.map((p) => (
              <div
                key={`h:${p.slotKey}`}
                className="absolute w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_14px_rgba(129,236,255,0.35)] ring-4 ring-primary/10 transition-[top,left] duration-300"
                style={{ left: `${(p.x ?? 0.5) * 100}%`, top: `${(p.y ?? 0.5) * 100}%`, transform: "translate(-50%, -50%)" }}
                title={p.playerId || ""}
              >
                <span className="text-[10px] font-black text-on-primary font-headline">{p.number || ""}</span>
              </div>
            ))}

            {match?.positions?.away?.map((p) => (
              <div
                key={`a:${p.slotKey}`}
                className="absolute w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/20 shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-[top,left] duration-300"
                style={{ left: `${(p.x ?? 0.5) * 100}%`, top: `${(p.y ?? 0.5) * 100}%`, transform: "translate(-50%, -50%)" }}
                title={p.playerId || ""}
              >
                <span className="text-[10px] font-black text-white font-headline">{p.number || ""}</span>
              </div>
            ))}

            <div
              className="absolute w-3 h-3 bg-secondary rounded-full shadow-[0_0_15px_#c3f400] transition-[top,left] duration-300"
              style={{ left: `${(match?.ball?.x ?? 0.5) * 100}%`, top: `${(match?.ball?.y ?? 0.5) * 100}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => applyPreset("press")}
            className="glass-panel px-4 py-4 rounded-lg flex flex-col items-center gap-2 hover:bg-primary-container/10 transition-all border border-primary/20 group"
          >
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span className="text-[9px] font-headline font-black text-primary uppercase tracking-tighter">Press Now</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("attack")}
            className="glass-panel px-4 py-4 rounded-lg flex flex-col items-center gap-2 hover:bg-secondary/10 transition-all border border-secondary/20 group"
          >
            <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
            <span className="text-[9px] font-headline font-black text-secondary uppercase tracking-tighter">All Out Attack</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("bus")}
            className="glass-panel px-4 py-4 rounded-lg flex flex-col items-center gap-2 hover:bg-error/10 transition-all border border-error/20 group"
          >
            <span className="material-symbols-outlined text-error group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            <span className="text-[9px] font-headline font-black text-error uppercase tracking-tighter">Park The Bus</span>
          </button>
        </div>

        {match ? (
          <div className="absolute right-6 bottom-28 flex flex-col gap-3 z-40">
            <div className="bg-surface-container-highest/80 backdrop-blur rounded-full p-3 border border-white/10 shadow-xl hover:border-primary/50 transition-all">
              <span className="material-symbols-outlined text-primary">radar</span>
            </div>
            <div className="bg-surface-container-highest/80 backdrop-blur rounded-full p-3 border border-white/10 shadow-xl hover:border-primary/50 transition-all">
              <span className="material-symbols-outlined text-primary">battery_low</span>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="fixed bottom-0 left-0 md:left-64 right-0 h-20 z-50 bg-[#20262f]/90 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex items-center px-6 gap-4 overflow-x-auto no-scrollbar">
        <div className="flex-shrink-0 border-r border-white/10 pr-6 mr-2">
          <h3 className="font-headline font-black text-primary text-xs uppercase tracking-widest">Active Squad</h3>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase">Lineup Rotation</p>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {(match ? myLineup : squadPlayers).slice(0, 6).map((p, idx) => (
            <SquadChip
              key={p?.id || idx}
              player={p}
              onSwap={() => {
                if (!match) return;
                const outId = p?.id;
                const inId = selectedBench?.id || myBench?.[0]?.id;
                if (!outId || !inId) return;
                send({ type: "match.substitute", outPlayerId: outId, inPlayerId: inId });
                setSelectedBenchId(null);
              }}
            />
          ))}
        </div>
        {match ? (
          <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              Bench
            </div>
            {myBench.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedBenchId((cur) => (cur === p.id ? null : p.id))}
                className={`h-10 px-3 rounded-lg border text-left transition-all ${
                  selectedBenchId === p.id
                    ? "border-secondary/60 bg-surface-container-highest/70"
                    : "border-outline-variant/20 bg-surface-container-highest/40 hover:border-secondary/30"
                }`}
                title={p.name}
              >
                <div className="text-[10px] font-headline font-black truncate w-24">{p.name}</div>
                <div className="text-[9px] text-on-surface-variant">{p.stamina}%</div>
              </button>
            ))}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Link } from "react-router-dom";

export function LiveMatch() {
  const { token, refreshMe } = useAuth();
  const [match, setMatch] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const start = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiRequest("/api/matches/start", { method: "POST", headers: authHeaders(token), json: {} });
      setMatch(data.match);
    } catch (err) {
      setError(err.message || "Failed to start match");
    } finally {
      setIsStarting(false);
    }
  }, [token]);

  const complete = useCallback(async () => {
    if (!match?.id) return;
    setIsCompleting(true);
    setError(null);
    try {
      const data = await apiRequest("/api/matches/complete", {
        method: "POST",
        headers: authHeaders(token),
        json: { matchId: match.id },
      });
      setResult(data.match);
      await refreshMe();
    } catch (err) {
      setError(err.message || "Failed to complete match");
    } finally {
      setIsCompleting(false);
    }
  }, [match?.id, refreshMe, token]);

  const outcomeLabel = useMemo(() => {
    if (!result?.outcome) return null;
    return result.outcome === "win" ? "WIN" : "LOSS";
  }, [result?.outcome]);

  const markTraderTutorial = useCallback(() => {
    if (result?.outcome !== "win") return;
    try {
      const done = localStorage.getItem("stadium_os:trader_tutorial_done") === "1";
      if (!done) localStorage.setItem("stadium_os:trader_tutorial_pending", "1");
    } catch {
      return;
    }
  }, [result?.outcome]);

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Match Simulation</h1>
              <div className="mt-2 text-sm text-on-surface-variant">
                TeamPower = attack + midfield + defense + coachBonus + chemistryBonus • Result = TeamPower * randomFactor
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={start} disabled={isStarting} className="px-6 py-4 text-xs neon-glow-primary">
                <Icon name="sports_soccer" className="text-sm" filled />
                {isStarting ? "Starting…" : "Start Match"}
              </Button>
              <Button onClick={complete} disabled={!match?.id || isCompleting} variant="ghost" className="px-6 py-4 text-xs">
                <Icon name="flag" className="text-sm" />
                {isCompleting ? "Completing…" : "Complete"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Match</div>
                {outcomeLabel ? (
                  <div
                    className={`text-[10px] font-headline font-black uppercase tracking-widest ${
                      outcomeLabel === "WIN" ? "text-secondary" : "text-error"
                    }`}
                  >
                    {outcomeLabel}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 text-sm text-on-surface">{match?.id ? match.id : "—"}</div>
              <div className="mt-2 text-[10px] text-on-surface-variant">Status: {result?.status || match?.status || "idle"}</div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Attack</div>
                  <div className="mt-1 font-headline font-black text-primary text-2xl">{result?.attack ?? match?.attack ?? "—"}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Midfield</div>
                  <div className="mt-1 font-headline font-black text-primary text-2xl">{result?.midfield ?? match?.midfield ?? "—"}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Defense</div>
                  <div className="mt-1 font-headline font-black text-primary text-2xl">{result?.defense ?? match?.defense ?? "—"}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Coach</div>
                  <div className="mt-1 font-headline font-black text-secondary text-2xl">+{result?.coachBonus ?? match?.coachBonus ?? "—"}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3 col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Chemistry</div>
                    <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                      +{result?.chemistryBonus ?? match?.chemistryBonus ?? 0}
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, result?.chemistryScore ?? match?.chemistryScore ?? 0))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-on-surface-variant">
                    {result?.chemistryScore ?? match?.chemistryScore ?? 0}%
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-on-surface-variant">TeamPower</div>
                <div className="font-headline font-black text-on-surface">{result?.teamPower ?? match?.teamPower ?? "—"}</div>
              </div>
              {result?.randomFactor ? (
                <div className="mt-2 flex items-center justify-between text-[10px] text-on-surface-variant">
                  <span>Score {result.resultScore} vs Opp {Math.round(result.opponentPower)}</span>
                  <span>×{Number(result.randomFactor).toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-5">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Rewards</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Coins</div>
                  <div className="mt-1 font-headline font-black text-secondary text-2xl">
                    {result?.rewardCoins ? `+${result.rewardCoins.toLocaleString?.()}` : "—"}
                  </div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">XP</div>
                  <div className="mt-1 font-headline font-black text-primary text-2xl">
                    {result?.rewardXp ? `+${result.rewardXp}` : "—"}
                  </div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Pack</div>
                  <div className="mt-1 font-headline font-black text-on-surface text-2xl">{result?.rewardPacks ?? "—"}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/market">
                  <Button className="px-6 py-4 text-xs neon-glow-primary" onClick={markTraderTutorial}>
                    <Icon name="currency_exchange" className="text-sm" />
                    Go Market
                  </Button>
                </Link>
                <Link to="/packs">
                  <Button variant="ghost" className="px-6 py-4 text-xs">
                    <Icon name="package_2" className="text-sm" filled />
                    Open Pack
                  </Button>
                </Link>
                <Link to="/squad">
                  <Button variant="ghost" className="px-6 py-4 text-xs">
                    <Icon name="group" className="text-sm" />
                    Squad
                  </Button>
                </Link>
              </div>

              <div className="mt-4 text-[10px] text-on-surface-variant">
                Rewards are issued server-side with anti-exploit checks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

function MissionCard({ mission, onClaim, isClaiming }) {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  return (
    <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-headline font-black text-lg tracking-tight uppercase">{mission.id.replace("_", " ")}</div>
          <div className="mt-2 text-sm text-on-surface-variant">
            {mission.progress}/{mission.target}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Reward</div>
          <div className="mt-1 flex items-center justify-end gap-2 text-sm">
            <span className="inline-flex items-center gap-1 text-secondary">
              <Icon name="monetization_on" className="text-sm" />
              +{mission.reward.coins}
            </span>
            {mission.reward.packs ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Icon name="package_2" className="text-sm" filled />
                +{mission.reward.packs}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
          {mission.claimed ? "CLAIMED" : mission.claimable ? "CLAIMABLE" : "IN PROGRESS"}
        </div>
        <Button
          onClick={() => onClaim(mission.id)}
          disabled={!mission.claimable || isClaiming}
          className={mission.claimable ? "neon-glow-primary px-5 py-3 text-xs" : "px-5 py-3 text-xs"}
          variant={mission.claimable ? "primary" : "ghost"}
        >
          <Icon name="redeem" className="text-sm" />
          {mission.claimed ? "Claimed" : "Claim"}
        </Button>
      </div>
    </div>
  );
}

export function Missions() {
  const { token, refreshMe } = useAuth();
  const [missions, setMissions] = useState([]);
  const [day, setDay] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/users/me/missions", { headers: authHeaders(token) });
      setMissions(data.missions || []);
      setDay(data.day || null);
    } catch (err) {
      setError(err.message || "Failed to load missions");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = useCallback(
    async (missionId) => {
      setClaimingId(missionId);
      setError(null);
      try {
        const data = await apiRequest("/api/users/me/missions/claim", {
          method: "POST",
          headers: authHeaders(token),
          json: { missionId },
        });
        setMissions(data.missions || []);
        await refreshMe();
      } catch (err) {
        setError(err.message || "Claim failed");
      } finally {
        setClaimingId(null);
      }
    },
    [refreshMe, token]
  );

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Missions</h1>
              <div className="mt-2 text-sm text-on-surface-variant">Daily goals that push your loop.</div>
              {day ? (
                <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Day: <span className="text-on-surface">{day}</span>
                </div>
              ) : null}
            </div>
            <Button onClick={load} disabled={isLoading} className="px-5 py-4 text-xs">
              <Icon name="refresh" className="text-sm" />
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="text-sm text-on-surface-variant">Loading…</div>
            ) : (
              missions.map((m) => (
                <MissionCard key={m.id} mission={m} onClaim={claim} isClaiming={claimingId === m.id} />
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}


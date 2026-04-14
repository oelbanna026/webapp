import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

export function Leaderboard() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/leaderboard?limit=50", { headers: authHeaders(token) });
      setRows(data.leaderboard || []);
    } catch (err) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Leaderboard</h1>
              <div className="mt-2 text-sm text-on-surface-variant">Global rank based on rating (ELO-style).</div>
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

          <div className="mt-8">
            {isLoading ? (
              <div className="text-sm text-on-surface-variant">Loading…</div>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.userId}
                    className="flex items-center justify-between gap-4 bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl border border-outline-variant/15 bg-surface/30 grid place-items-center font-headline font-black text-primary">
                        #{r.rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-headline font-black truncate">{r.username}</div>
                        <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          XP {r.xp?.toLocaleString?.() ?? 0}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                        Rating
                      </div>
                      <div className="mt-1 font-headline font-black text-2xl text-secondary tracking-tighter">
                        {r.rankRating?.toLocaleString?.() ?? 1000}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

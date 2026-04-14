import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useClub } from "../club/useClub";
import { Button } from "../components/Button";
import { AppShell } from "../components/layout/AppShell";
import { apiRequest, authHeaders } from "../lib/api";
import { Icon } from "../components/Icon";

export function Profile() {
  const { user, token, refreshMe } = useAuth();
  const { club, refreshClub } = useClub();
  const [error, setError] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [economy, setEconomy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdatingCoach, setIsUpdatingCoach] = useState(false);

  const userId = useMemo(() => user?.id || "—", [user]);

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/api/users/me/wallet", { headers: authHeaders(token) });
      setWallet(data);
      const econ = await apiRequest("/api/users/me/economy?days=30", { headers: authHeaders(token) });
      setEconomy(econ);
    } catch (err) {
      setError(err.message || "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  async function claimDaily() {
    setIsClaiming(true);
    setError(null);
    try {
      await apiRequest("/api/users/me/rewards/daily", { method: "POST", headers: authHeaders(token), json: {} });
      await refreshMe();
      await loadWallet();
    } catch (err) {
      setError(err.message || "Failed to claim daily reward");
    } finally {
      setIsClaiming(false);
    }
  }

  async function setCoach(type) {
    setIsUpdatingCoach(true);
    setError(null);
    try {
      await apiRequest("/api/clubs/me/coach", { method: "PATCH", headers: authHeaders(token), json: { coach: { type } } });
      await refreshClub();
    } catch (err) {
      setError(err.message || "Failed to update coach");
    } finally {
      setIsUpdatingCoach(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Profile</h1>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-highest/60 rounded-xl p-5 border border-outline-variant/20">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Commander ID
              </div>
              <div className="mt-2 font-headline font-black text-lg">{userId}</div>
              <div className="mt-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Username
              </div>
              <div className="mt-2 font-headline font-black text-lg">{user?.username || "—"}</div>
              <div className="mt-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Email
              </div>
              <div className="mt-2 text-sm text-on-surface">{user?.email || "—"}</div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">XP</div>
                  <div className="mt-1 font-headline font-black text-primary text-xl">{(user?.xp ?? 0).toLocaleString?.()}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Starter</div>
                  <div className="mt-1 font-headline font-black text-on-surface text-xl">{user?.starterPacks ?? 0}</div>
                </div>
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-3">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-headline font-bold">Free</div>
                  <div className="mt-1 font-headline font-black text-on-surface text-xl">{user?.freePacks ?? 0}</div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <Button onClick={claimDaily} disabled={isClaiming} className="px-5 py-3 text-xs neon-glow-primary">
                  <Icon name="redeem" className="text-sm" />
                  {isClaiming ? "Claiming…" : "Claim Daily Reward"}
                </Button>
                <Button onClick={loadWallet} disabled={isLoading} variant="ghost" className="px-5 py-3 text-xs">
                  <Icon name="refresh" className="text-sm" />
                  Refresh
                </Button>
              </div>
              <div className="mt-3 text-[10px] text-on-surface-variant">
                Last daily claim: <span className="text-on-surface">{user?.lastDailyClaimAt ? new Date(user.lastDailyClaimAt).toLocaleString() : "—"}</span>
              </div>
              <div className="mt-2 text-[10px] text-on-surface-variant">
                Daily streak: <span className="text-on-surface">{user?.dailyStreak ?? 0}</span>
              </div>
            </div>

            <div className="bg-surface-container-highest/60 rounded-xl p-5 border border-outline-variant/20">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Club Identity
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Club</span>
                  <span className="font-headline font-black truncate">{club?.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Theme</span>
                  <span className="font-headline font-black">{club?.theme || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Stadium</span>
                  <span className="font-headline font-black">{club?.stadium?.name || "—"}</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Coach</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant={club?.coach?.type === "attacking" ? "primary" : "ghost"}
                    onClick={() => setCoach("attacking")}
                    disabled={isUpdatingCoach}
                    className="px-4 py-3 text-xs"
                  >
                    <Icon name="bolt" className="text-sm" filled />
                    Attacking
                  </Button>
                  <Button
                    variant={club?.coach?.type === "balanced" ? "primary" : "ghost"}
                    onClick={() => setCoach("balanced")}
                    disabled={isUpdatingCoach}
                    className="px-4 py-3 text-xs"
                  >
                    <Icon name="tactic" className="text-sm" />
                    Balanced
                  </Button>
                  <Button
                    variant={club?.coach?.type === "defensive" ? "primary" : "ghost"}
                    onClick={() => setCoach("defensive")}
                    disabled={isUpdatingCoach}
                    className="px-4 py-3 text-xs"
                  >
                    <Icon name="shield" className="text-sm" />
                    Defensive
                  </Button>
                </div>
                <div className="mt-3 text-[10px] text-on-surface-variant">
                  Bonus: +{club?.coach?.bonusAttack ?? 0} ATK • +{club?.coach?.bonusDefense ?? 0} DEF • +{club?.coach?.bonusAll ?? 0} ALL
                </div>
              </div>

              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Coins Balance
              </div>
              <div className="mt-2 font-headline font-black text-4xl text-primary tracking-tighter">
                {(user?.coins ?? 0).toLocaleString?.()}
              </div>

              {error ? <div className="mt-4 text-sm text-error">{error}</div> : null}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Economy (30d)
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">In</span>
                    <span className="font-headline font-black text-secondary">
                      +{economy?.totals?.income?.toLocaleString?.() ?? "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Out</span>
                    <span className="font-headline font-black text-error">
                      {economy?.totals?.expense?.toLocaleString?.() ?? "—"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Net</span>
                    <span className="font-headline font-black text-on-surface">
                      {economy?.totals?.net?.toLocaleString?.() ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl p-4">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Player Type
                  </div>
                  <div className="mt-2 font-headline font-black text-lg">
                    {(economy?.persona?.primary || "—").toUpperCase?.() ?? "—"}
                  </div>
                  <div className="mt-3 text-[10px] text-on-surface-variant">
                    Gamer {economy?.persona?.weights?.gamer ?? 0}% • Trader {economy?.persona?.weights?.trader ?? 0}% • Competitor{" "}
                    {economy?.persona?.weights?.competitor ?? 0}%
                  </div>
                  <div className="mt-2 text-[10px] text-on-surface-variant">
                    Packs {economy?.persona?.scores?.gamer ?? 0} • Trades {economy?.persona?.scores?.trader ?? 0} • Matches{" "}
                    {economy?.persona?.scores?.competitor ?? 0}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Transactions
                  </div>
                  <div className="text-[10px] text-on-surface-variant">{isLoading ? "Loading…" : ""}</div>
                </div>
                <div className="mt-3 space-y-2 max-h-[320px] overflow-auto pr-1">
                  {(wallet?.transactions || []).length === 0 ? (
                    <div className="text-sm text-on-surface-variant">No transactions yet.</div>
                  ) : (
                    wallet.transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-4 bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-headline font-bold uppercase tracking-widest truncate">{t.type}</div>
                          <div className="mt-1 text-[10px] text-on-surface-variant">{new Date(t.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-headline font-black ${t.delta >= 0 ? "text-secondary" : "text-error"}`}>
                            {t.delta >= 0 ? "+" : ""}
                            {t.delta.toLocaleString?.()}
                          </div>
                          <div className="mt-1 text-[10px] text-on-surface-variant">Bal {t.balanceAfter.toLocaleString?.()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

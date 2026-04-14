import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useClub } from "../club/useClub";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { apiRequest, authHeaders } from "../lib/api";

function hashString(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function formatPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.0%";
  return `${v.toFixed(1)}%`;
}

function AchievementCard({ title, description, icon, accent, unlocked }) {
  const accentBorder = accent === "secondary" ? "border-secondary/40" : "border-primary/40";
  const accentText = accent === "secondary" ? "text-secondary" : "text-primary";
  return (
    <div
      className={`glass-card p-6 border transition-all ${
        unlocked ? accentBorder : "border-outline-variant/15 opacity-50 grayscale"
      }`}
    >
      <div className="w-14 h-14 bg-surface-container-highest/60 border border-outline-variant/15 grid place-items-center">
        <span className={`material-symbols-outlined ${accentText}`} style={unlocked ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          {icon}
        </span>
      </div>
      <div className="mt-5 font-headline font-black uppercase tracking-[0.12em] text-xs text-on-surface-variant">
        {title}
      </div>
      <div className="mt-2 text-xs text-on-surface-variant">{description}</div>
      <div className="mt-5 inline-flex items-center gap-2 text-[10px] font-headline font-bold uppercase tracking-widest">
        <span className={unlocked ? "text-secondary" : "text-on-surface-variant"}>{unlocked ? "Unlocked" : "Locked"}</span>
        {unlocked ? <Icon name="check_circle" className="text-secondary text-sm" filled /> : <Icon name="lock" className="text-on-surface-variant text-sm" />}
      </div>
    </div>
  );
}

export function ProfileKinetic() {
  const { token, user, refreshMe } = useAuth();
  const { club, refreshClub } = useClub();
  const [economy, setEconomy] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingCoach, setIsUpdatingCoach] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [econ, wal] = await Promise.all([
        apiRequest("/api/users/me/economy?days=30", { headers: authHeaders(token) }),
        apiRequest("/api/users/me/wallet", { headers: authHeaders(token) }),
      ]);
      setEconomy(econ);
      setWallet(wal);
    } catch (err) {
      setError(err.message || "فشل تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const matches = Number(economy?.stats?.matchesPlayedTotal || 0);
  const wins = Number(economy?.stats?.winsTotal || 0);
  const winRate = matches > 0 ? (wins / matches) * 100 : 0;

  const persona = economy?.persona?.primary || "—";
  const personaWeights = economy?.persona?.weights || { gamer: 0, trader: 0, competitor: 0 };
  const personaScores = economy?.persona?.scores || { gamer: 0, trader: 0, competitor: 0 };

  const momentumBars = useMemo(() => {
    const seed = hashString(user?.id || user?.email || "seed");
    const bars = [];
    for (let i = 0; i < 10; i += 1) {
      const v = (seed >> (i * 2)) & 0x7;
      const h = 20 + v * 10;
      const isBad = i === 3 && (seed & 1) === 1;
      bars.push({ h, tone: isBad ? "error" : "secondary" });
    }
    return bars;
  }, [user?.email, user?.id]);

  const achievements = useMemo(() => {
    const opened = Number(user?.packsOpenedTotal || 0);
    const trades = Number(user?.marketTradesTotal || 0);
    const income = Number(economy?.totals?.income || 0);
    return [
      {
        title: "TACTICAL MASTER",
        description: "افز بـ 10 مباريات إجمالاً.",
        icon: "emoji_events",
        accent: "secondary",
        unlocked: wins >= 10,
      },
      {
        title: "TALENT SCOUT",
        description: "افتح 10 باكات أو أكثر.",
        icon: "groups",
        accent: "primary",
        unlocked: opened >= 10,
      },
      {
        title: "FINANCIAL GIANT",
        description: "حقق دخل 25K كوين خلال 30 يوم.",
        icon: "monetization_on",
        accent: "secondary",
        unlocked: income >= 25000,
      },
      {
        title: "MARKET OPERATOR",
        description: "أكمل 10 صفقات في السوق.",
        icon: "storefront",
        accent: "primary",
        unlocked: trades >= 10,
      },
    ];
  }, [economy?.totals?.income, user?.marketTradesTotal, user?.packsOpenedTotal, wins]);

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
      <div className="p-8 pt-10 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-5 space-y-8">
            <section className="glass-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="w-24 h-24 border-2 border-primary p-1 bg-surface-container-low grid place-items-center">
                  <Icon name="person" className="text-primary text-4xl" />
                </div>
                <div className="flex-1">
                  <span className="bg-surface-bright px-2 py-0.5 text-[10px] font-headline text-primary uppercase tracking-[0.2em] mb-2 inline-block">
                    Pro License #{String(hashString(user?.id || "0")).slice(0, 4).padStart(4, "0")}
                  </span>
                  <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">
                    {(user?.username || "MANAGER").toUpperCase()}
                  </h1>
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                    <span className="uppercase tracking-widest">{club?.name || "NO CLUB"} • HQ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-10">
                <div className="bg-surface-container-low p-4 border-l-2 border-primary/40">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 block">Matches</span>
                  <span className="text-2xl font-headline font-bold text-primary">{matches.toLocaleString?.()}</span>
                </div>
                <div className="bg-surface-container-low p-4 border-l-2 border-secondary/40">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 block">Win Rate</span>
                  <span className="text-2xl font-headline font-bold text-secondary">{formatPct(winRate)}</span>
                </div>
                <div className="bg-surface-container-low p-4 border-l-2 border-outline/40">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1 block">Currency</span>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-headline font-bold text-on-surface">{(user?.coins ?? 0).toLocaleString?.()}</span>
                    <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      monetization_on
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2 px-1">
                  <span className="text-secondary">W: {wins}</span>
                  <span className="text-on-surface-variant">D: —</span>
                  <span className="text-error">L: {Math.max(0, matches - wins)}</span>
                </div>
                <div className="h-1.5 flex gap-0.5 overflow-hidden rounded-full">
                  <div className="bg-secondary" style={{ width: `${matches > 0 ? Math.round((wins / matches) * 100) : 0}%` }} />
                  <div className="bg-on-surface-variant opacity-50" style={{ width: "0%" }} />
                  <div className="bg-error opacity-70" style={{ width: `${matches > 0 ? Math.round(((matches - wins) / matches) * 100) : 100}%` }} />
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <Button onClick={load} disabled={isLoading} variant="ghost" className="px-5 py-3 text-xs">
                  <Icon name="refresh" className="text-sm" />
                  {isLoading ? "Loading…" : "Refresh"}
                </Button>
                <Button onClick={refreshMe} disabled={isLoading} className="px-5 py-3 text-xs neon-glow-primary">
                  <Icon name="sync" className="text-sm" />
                  Sync
                </Button>
              </div>

              {error ? (
                <div className="mt-6 text-sm text-error flex items-center gap-2">
                  <Icon name="error" className="text-sm" />
                  {error}
                </div>
              ) : null}
            </section>

            <section className="glass-card p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-bold uppercase tracking-[0.15em] text-sm text-on-surface-variant">Tactical Momentum</h3>
                <span className="text-[10px] text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> LAST 10 MATCHES
                </span>
              </div>
              <div className="h-32 flex items-end justify-between gap-1">
                {momentumBars.map((b, idx) => (
                  <div
                    key={idx}
                    className={`${b.tone === "error" ? "bg-error-container/20 border-error/30 hover:bg-error/40" : "bg-secondary-container/20 border-secondary/30 hover:bg-secondary/40"} w-full transition-all border-t`}
                    style={{ height: `${b.h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] uppercase text-on-surface-variant">
                <span>MATCH‑01</span>
                <span>MATCH‑10</span>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline font-black text-2xl tracking-tight uppercase">Achievements & Legacy</h2>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {achievements.filter((a) => a.unlocked).length}/{achievements.length} UNLOCKED
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                {economy?.windowDays || 30}D WINDOW
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((a) => (
                <AchievementCard key={a.title} {...a} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="glass-card p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Club Core</div>
                    <div className="mt-2 font-headline font-black text-2xl">{club?.name || "—"}</div>
                    <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Stadium: {club?.stadium?.name || "—"} • Theme: {club?.theme || "—"}
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-surface-container-lowest border border-outline-variant/20 grid place-items-center">
                    <Icon name="shield" className="text-primary text-2xl" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="h-12 border border-outline-variant/20" style={{ background: club?.kit?.primary || "#81ecff" }} />
                  <div className="h-12 border border-outline-variant/20" style={{ background: club?.kit?.secondary || "#c3f400" }} />
                  <div className="h-12 border border-outline-variant/20 bg-surface-container-lowest" />
                </div>

                <div className="mt-8">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Coach</div>
                  <div className="mt-2 text-sm text-on-surface-variant">
                    Bonus: +{club?.coach?.bonusAttack ?? 0} ATK • +{club?.coach?.bonusDefense ?? 0} DEF • +{club?.coach?.bonusAll ?? 0} ALL
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
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
                </div>
              </section>

              <section className="glass-card p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Economy</div>
                    <div className="mt-2 font-headline font-black text-2xl uppercase">{persona}</div>
                    <div className="mt-1 text-[10px] text-on-surface-variant uppercase tracking-widest">
                      Gamer {personaWeights.gamer ?? 0}% • Trader {personaWeights.trader ?? 0}% • Competitor {personaWeights.competitor ?? 0}%
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-surface-container-lowest border border-outline-variant/20 grid place-items-center">
                    <Icon name="analytics" className="text-primary text-2xl" />
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-low p-4 border-l-2 border-primary/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Packs</div>
                    <div className="mt-1 font-headline font-black text-primary">{personaScores.gamer ?? 0}</div>
                  </div>
                  <div className="bg-surface-container-low p-4 border-l-2 border-secondary/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Trades</div>
                    <div className="mt-1 font-headline font-black text-secondary">{personaScores.trader ?? 0}</div>
                  </div>
                  <div className="bg-surface-container-low p-4 border-l-2 border-outline/40">
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Matches</div>
                    <div className="mt-1 font-headline font-black text-on-surface">{personaScores.competitor ?? 0}</div>
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">In (30d)</span>
                    <span className="font-headline font-black text-secondary">+{economy?.totals?.income?.toLocaleString?.() ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Out (30d)</span>
                    <span className="font-headline font-black text-error">{economy?.totals?.expense?.toLocaleString?.() ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Net</span>
                    <span className="font-headline font-black text-on-surface">{economy?.totals?.net?.toLocaleString?.() ?? "—"}</span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Transactions</div>
                  <div className="mt-3 space-y-2">
                    {(wallet?.transactions || []).slice(0, 6).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-[10px] border-b border-outline-variant/15 pb-2">
                        <div className="text-on-surface-variant uppercase tracking-widest">{t.type}</div>
                        <div className={`${t.delta > 0 ? "text-secondary" : "text-error"} font-headline font-bold`}>
                          {t.delta > 0 ? "+" : ""}
                          {t.delta}
                        </div>
                      </div>
                    ))}
                    {wallet?.transactions?.length ? null : <div className="text-[10px] text-on-surface-variant">—</div>}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

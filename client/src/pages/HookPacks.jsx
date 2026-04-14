import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { apiRequest, authHeaders } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useSfx } from "../hooks/useSfx";

const RARITY_STYLES = {
  common: { glow: "shadow-[0_0_60px_rgba(129,236,255,0.15)]", label: "text-on-surface-variant" },
  rare: { glow: "shadow-[0_0_80px_rgba(129,236,255,0.35)]", label: "text-primary" },
  epic: { glow: "shadow-[0_0_100px_rgba(162,170,255,0.45)]", label: "text-tertiary" },
  legendary: { glow: "shadow-[0_0_120px_rgba(195,244,0,0.45)]", label: "text-secondary" },
};

function Stat({ label, value }) {
  return (
    <div className="bg-surface-container-highest/60 border border-outline-variant/15 rounded-xl px-3 py-2 flex items-center justify-between">
      <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="font-headline font-black text-on-surface">{value}</div>
    </div>
  );
}

export function HookPacks() {
  const { token, user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const sfx = useSfx();

  const [opened, setOpened] = useState([]);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("idle");
  const [current, setCurrent] = useState(null);
  const [isAutoNavigating, setIsAutoNavigating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(false);

  const remaining = useMemo(() => user?.starterPacks ?? 0, [user?.starterPacks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      setIsSyncing(true);
      try {
        await refreshMe();
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  useEffect(() => {
    const onEnable = () => setSfxEnabled(true);
    window.addEventListener("pointerdown", onEnable, { once: true });
    return () => window.removeEventListener("pointerdown", onEnable);
  }, []);

  const openOne = useCallback(async () => {
    setIsOpening(true);
    setError(null);
    setCurrent(null);
    setStage("charging");
    if (sfxEnabled) sfx.whoosh();

    try {
      await new Promise((r) => setTimeout(r, 650));
      setStage("walkout");
      if (sfxEnabled) sfx.whoosh();

      const data = await apiRequest("/api/packs/open", { method: "POST", headers: authHeaders(token), json: {} });
      setCurrent(data);

      await new Promise((r) => setTimeout(r, 650));
      setStage("reveal");
      if (sfxEnabled) sfx.reveal(data.rarity);

      if (data.duplicate) {
        await new Promise((r) => setTimeout(r, 450));
        if (sfxEnabled) sfx.duplicate();
      }

      setOpened((prev) => [data, ...prev].slice(0, 2));
      await refreshMe();

      await new Promise((r) => setTimeout(r, 900));
      setStage("idle");
      return data;
    } catch (err) {
      setError(err.message || "فشل فتح الباك");
      setStage("idle");
      return null;
    } finally {
      setIsOpening(false);
    }
  }, [refreshMe, sfx, sfxEnabled, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      if (!user) return;
      if (isSyncing) return;
      if (remaining === 0) return;
      if (isOpening) return;
      if (stage !== "idle") return;
      await openOne();
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpening, isSyncing, openOne, remaining, stage, user]);

  const canContinue = remaining === 0 && opened.length >= 2;
  const rarity = current?.rarity || "common";
  const styles = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  useEffect(() => {
    if (!canContinue) return;
    if (isOpening) return;
    if (stage !== "idle") return;
    if (isAutoNavigating) return;

    setIsAutoNavigating(true);
    setStage("complete");
    if (sfxEnabled) sfx.click();

    const t = setTimeout(() => {
      navigate("/squad", { replace: true });
    }, 1000);

    return () => clearTimeout(t);
  }, [canContinue, isAutoNavigating, isOpening, navigate, sfx, sfxEnabled, stage]);

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">🎁 أول مكافأة</h1>
              <div className="mt-2 text-sm text-on-surface-variant">
                تم منحك <span className="text-secondary font-headline font-black">+2000 Coins</span> و{" "}
                <span className="text-primary font-headline font-black">2 Starter Packs</span>.
              </div>
              <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                باقي باكات البداية: <span className="text-on-surface">{remaining}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
                <Icon name="package_2" className="text-primary text-sm" filled />
                <span className="font-headline font-bold text-xs tracking-tight">{isOpening ? "Opening…" : "Auto Open"}</span>
              </div>
              <Button
                onClick={refreshMe}
                disabled={isOpening || isSyncing}
                variant="ghost"
                className="px-4 py-4 text-xs"
              >
                <Icon name="refresh" className="text-sm" />
                {isSyncing ? "Updating…" : "Update"}
              </Button>
              <Button onClick={openOne} disabled={isOpening || remaining === 0} className="px-6 py-4 text-xs neon-glow-primary">
                <Icon name="package_2" className="text-sm" filled />
                Open Now
              </Button>
              <Button
                onClick={() => navigate("/squad", { replace: true })}
                disabled={!canContinue}
                variant="ghost"
                className="px-6 py-4 text-xs"
              >
                <Icon name="group" className="text-sm" />
                إلى بناء الفريق
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
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">سينما فتح الباك</div>

              <div className="mt-4 relative w-full h-[340px] rounded-2xl border border-outline-variant/15 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-surface via-surface/90 to-transparent" />
                <div className="absolute inset-0 hud-scanline opacity-20" />

                {stage === "idle" ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="font-headline font-black text-xl tracking-tight">{canContinue ? "COMPLETE" : "READY"}</div>
                      <div className="mt-2 text-sm text-on-surface-variant">
                        {canContinue ? "جاهز لبناء الفريق." : "بيتم فتح الباكات تلقائيًا…"}
                      </div>
                    </div>
                  </div>
                ) : null}

                {stage === "complete" ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-70" />
                      <div className="absolute -inset-32 bg-gradient-to-br from-secondary/20 via-primary/10 to-transparent blur-3xl animate-pulse" />
                    </div>
                    <div className="relative text-center">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-outline-variant/20 bg-surface-container-highest/60">
                        <Icon name="check_circle" className="text-secondary" filled />
                        <div className="font-headline font-black uppercase tracking-widest text-xs">READY TO BUILD</div>
                      </div>
                      <div className="mt-4 text-sm text-on-surface-variant">جارٍ نقلك لبناء الفريق…</div>
                    </div>
                  </div>
                ) : null}

                {stage === "charging" ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="font-headline font-black text-xl tracking-tight text-primary">CHARGING</div>
                      <div className="mt-3 h-1 w-56 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : null}

                {stage === "walkout" ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-70" />
                      <div className="absolute -inset-32 bg-gradient-to-br from-primary/25 via-transparent to-secondary/15 blur-3xl animate-pulse" />
                    </div>
                    <div className="relative text-center">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-outline-variant/20 bg-surface-container-highest/60">
                        <Icon name="bolt" className="text-primary" filled />
                        <div className="font-headline font-black uppercase tracking-widest text-xs">WALKOUT</div>
                      </div>
                      <div className="mt-4 text-sm text-on-surface-variant">Signal acquired…</div>
                    </div>
                  </div>
                ) : null}

                {stage === "reveal" && current?.player ? (
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <div
                      className={`relative w-full max-w-md mx-auto rounded-2xl border border-outline-variant/20 bg-surface-container-highest/60 backdrop-blur-md overflow-hidden ${styles.glow}`}
                    >
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-surface to-transparent opacity-60" />
                        <div className="absolute -inset-24 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 blur-2xl" />
                      </div>
                      <div className="relative p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">PLAYER</div>
                            <div className="mt-2 font-headline font-black text-2xl tracking-tight truncate">{current.player.name}</div>
                            <div className={`mt-2 text-[10px] font-headline font-bold uppercase tracking-widest ${styles.label}`}>{rarity}</div>
                            {current.limitedHit ? (
                              <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
                                <Icon name="local_fire_department" className="text-sm" filled />
                                LIMITED
                              </div>
                            ) : null}
                            {current.duplicate ? (
                              <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
                                <Icon name="repeat" className="text-sm" />
                                DUPLICATE +{current.coinsAwarded?.toLocaleString?.()} COINS
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">OVR</div>
                            <div className="mt-1 font-headline font-black text-5xl text-primary tracking-tighter leading-none">{current.player.rating}</div>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <Stat label="Pace" value={current.player.stats.pace} />
                          <Stat label="Shooting" value={current.player.stats.shooting} />
                          <Stat label="Passing" value={current.player.stats.passing} />
                          <Stat label="Defense" value={current.player.stats.defense} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  آخر كروت تم فتحها
                </div>
                {opened.length === 0 ? (
                  <div className="text-sm text-on-surface-variant">جارٍ فتح الباكات…</div>
                ) : (
                  opened.map((o, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 bg-surface-container-highest/70 border border-outline-variant/15 rounded-xl px-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="font-headline font-black truncate">{o.player?.name || "—"}</div>
                        <div className="mt-1 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                          {o.rarity} • {o.duplicate ? `Duplicate +${o.coinsAwarded}` : "New"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-headline font-black text-2xl text-primary tracking-tighter">{o.player?.rating ?? "—"}</div>
                        <div className="mt-1 text-[10px] text-on-surface-variant">OVR</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-5">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                التالي: Squad Setup
              </div>
              <div className="mt-3 text-sm text-on-surface-variant">
                بعد ما تخلص الباكات، هتدخل Squad Builder وتبدأ تحط اللاعبين وتبني فريقك.
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-on-surface-variant">
                <Icon name="tactic" className="text-primary text-sm" />
                Formation: 4-3-3 أو 4-4-2
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

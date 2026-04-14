import { useCallback, useEffect, useMemo, useState } from "react";
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

export function PackOpening() {
  const { token, user, refreshMe } = useAuth();
  const sfx = useSfx();

  const [stage, setStage] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [event, setEvent] = useState(null);

  const rarity = result?.rarity || "common";
  const styles = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const open = useCallback(async (packType = "standard") => {
    setError(null);
    setIsOpening(true);
    setResult(null);
    setStage("charging");
    sfx.whoosh();

    try {
      await new Promise((r) => setTimeout(r, 650));
      setStage("walkout");
      sfx.whoosh();

      const data = await apiRequest("/api/packs/open", { method: "POST", headers: authHeaders(token), json: { packType } });
      setResult(data);

      await new Promise((r) => setTimeout(r, 650));
      setStage("reveal");
      sfx.reveal(data.rarity);

      if (data.duplicate) {
        await new Promise((r) => setTimeout(r, 450));
        sfx.duplicate();
      }

      await refreshMe();
    } catch (err) {
      setError(err.message || "Pack open failed");
      setStage("idle");
    } finally {
      setIsOpening(false);
    }
  }, [refreshMe, sfx, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/api/events/current", { headers: authHeaders(token) });
        if (!cancelled) setEvent(data.event || null);
      } catch {
        if (!cancelled) setEvent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const card = useMemo(() => {
    const p = result?.player;
    if (!p) return null;
    return (
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
              <div className="mt-2 font-headline font-black text-2xl tracking-tight truncate">{p.name}</div>
              <div className={`mt-2 text-[10px] font-headline font-bold uppercase tracking-widest ${styles.label}`}>{rarity}</div>
              {result.limitedHit ? (
                <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
                  <Icon name="local_fire_department" className="text-sm" filled />
                  LIMITED
                </div>
              ) : null}
              {result.duplicate ? (
                <div className="mt-2 inline-flex items-center gap-2 text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
                  <Icon name="repeat" className="text-sm" />
                  DUPLICATE +{result.coinsAwarded.toLocaleString?.()} COINS
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">OVR</div>
              <div className="mt-1 font-headline font-black text-5xl text-primary tracking-tighter leading-none">{p.rating}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="Pace" value={p.stats.pace} />
            <Stat label="Shooting" value={p.stats.shooting} />
            <Stat label="Passing" value={p.stats.passing} />
            <Stat label="Defense" value={p.stats.defense} />
          </div>
        </div>
      </div>
    );
  }, [rarity, result, styles.glow, styles.label]);

  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Pack Opening</h1>
              <div className="mt-2 text-sm text-on-surface-variant">
                Rarity distribution: Common 60% • Rare 25% • Epic 10% • Legendary 5%
              </div>
              <div className="mt-2 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                Starter packs: <span className="text-on-surface">{user?.starterPacks ?? 0}</span> • Free packs:{" "}
                <span className="text-on-surface">{user?.freePacks ?? 0}</span>
              </div>
              {event ? (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-highest/40">
                  <Icon name="celebration" className="text-secondary text-sm" />
                  <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                    Event: <span className="text-on-surface">{event.name}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-highest/50 rounded-lg border border-outline-variant/10">
                <Icon name="monetization_on" className="text-secondary text-sm" />
                <span className="font-headline font-bold text-sm tracking-tight">{user?.coins?.toLocaleString?.() ?? "—"}</span>
              </div>
              <Button onClick={() => open("standard")} disabled={isOpening} className="px-6 py-4 text-xs neon-glow-primary">
                <Icon name="package_2" className="text-sm" filled />
                {isOpening ? "Opening…" : "Open Pack"}
              </Button>
              {event?.eventPack?.costCoins ? (
                <Button onClick={() => open("event")} disabled={isOpening} variant="ghost" className="px-6 py-4 text-xs">
                  <Icon name="celebration" className="text-sm" />
                  Event Pack ({Number(event.eventPack.costCoins).toLocaleString?.()})
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mt-6 glass-card rounded-xl p-4 border border-error/30 text-error flex items-center gap-2">
              <Icon name="error" className="text-sm" />
              {error}
            </div>
          ) : null}

          <div className="mt-10">
            <div className="relative w-full h-[420px] rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-surface via-surface/90 to-transparent" />
              <div className="absolute inset-0 hud-scanline opacity-20" />

              {stage === "idle" ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="font-headline font-black text-xl tracking-tight">READY</div>
                    <div className="mt-2 text-sm text-on-surface-variant">Trigger the walkout sequence.</div>
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

              {stage === "reveal" ? (
                <div className="absolute inset-0 grid place-items-center p-6">
                  <div className="w-full">{card}</div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Duplicate Handling
                </div>
                <div className="mt-2 text-sm text-on-surface-variant">Duplicates convert to coins based on rarity.</div>
              </div>
              <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Sound Effects
                </div>
                <div className="mt-2 text-sm text-on-surface-variant">Synth SFX plays on charge, reveal, and duplicate.</div>
              </div>
              <div className="bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-4">
                <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
                  Ownership
                </div>
                <div className="mt-2 text-sm text-on-surface-variant">New cards are minted to your account (ownerId).</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

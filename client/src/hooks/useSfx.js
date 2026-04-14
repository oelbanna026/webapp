import { useCallback, useMemo, useRef } from "react";

function playTone(ctx, { freq, durationMs, type = "sine", gain = 0.06 }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g);
  g.connect(ctx.destination);

  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function useSfx() {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const api = useMemo(() => {
    return {
      whoosh() {
        const ctx = getCtx();
        playTone(ctx, { freq: 180, durationMs: 90, type: "sawtooth", gain: 0.04 });
        setTimeout(() => playTone(ctx, { freq: 140, durationMs: 120, type: "triangle", gain: 0.03 }), 80);
      },
      click() {
        const ctx = getCtx();
        playTone(ctx, { freq: 520, durationMs: 40, type: "square", gain: 0.02 });
      },
      reveal(rarity) {
        const ctx = getCtx();
        const base = rarity === "legendary" ? 740 : rarity === "epic" ? 620 : rarity === "rare" ? 520 : 420;
        playTone(ctx, { freq: base, durationMs: 120, type: "triangle", gain: 0.06 });
        setTimeout(() => playTone(ctx, { freq: base * 1.25, durationMs: 140, type: "triangle", gain: 0.05 }), 120);
        if (rarity === "legendary") {
          setTimeout(() => playTone(ctx, { freq: 980, durationMs: 220, type: "sine", gain: 0.05 }), 240);
        }
      },
      duplicate() {
        const ctx = getCtx();
        playTone(ctx, { freq: 220, durationMs: 140, type: "square", gain: 0.03 });
        setTimeout(() => playTone(ctx, { freq: 180, durationMs: 160, type: "square", gain: 0.03 }), 120);
      },
    };
  }, [getCtx]);

  return api;
}


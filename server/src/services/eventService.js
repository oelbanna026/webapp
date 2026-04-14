function dayKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const EVENT_ROTATION = [
  {
    id: "neon_surge",
    name: "Neon Surge",
    marketFeePercent: 3,
    marketIndexMultiplier: 1.08,
    packBoost: { legendary: 1, epic: 2 },
    eventPack: { costCoins: 4000, limitedChance: { legendary: 0.65, epic: 0.45, rare: 0.2 } },
    limited: ["legendary:nova-striker", "epic:ion-finisher"],
  },
  {
    id: "classic_heritage",
    name: "Classic Heritage",
    marketFeePercent: 7,
    marketIndexMultiplier: 0.95,
    packBoost: { rare: 2, epic: 1 },
    eventPack: { costCoins: 3800, limitedChance: { legendary: 0.55, epic: 0.4, rare: 0.18 } },
    limited: ["legendary:galactic-maestro", "epic:edge-controller"],
  },
  {
    id: "midweek_flash",
    name: "Midweek Flash",
    marketFeePercent: 0,
    marketIndexMultiplier: 1.12,
    packBoost: { rare: 3 },
    eventPack: { costCoins: 4200, limitedChance: { epic: 0.35, rare: 0.25 } },
    limited: ["rare:quantum-poacher", "rare:apex-winger"],
  },
];

function getCurrentEvent(now = new Date()) {
  const key = dayKey(now);
  const idx = Math.abs(hashString(key)) % EVENT_ROTATION.length;
  const base = EVENT_ROTATION[idx];
  const endsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { ...base, day: key, endsAt: endsAt.toISOString() };
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

module.exports = { getCurrentEvent };

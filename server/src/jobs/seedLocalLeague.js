const { PlayerTemplate } = require("../models/PlayerTemplate");
const { invalidateTemplatePoolCache } = require("../services/templatePoolService");
const { slugify } = require("../utils/playerPool");
const { LEAGUE_KEY, EGYPT_LEAGUE_TEAMS } = require("../content/egyptLeague");

const PORTRAIT_KEYS = ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10"];
const SEED_VERSION = 2;

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function xorshift32(seed) {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function rarityFromRating(rating, rng) {
  const r = Number(rating) || 0;
  if (r >= 88) return rng() < 0.25 ? "legendary" : "epic";
  if (r >= 82) return rng() < 0.5 ? "epic" : "rare";
  if (r >= 76) return rng() < 0.55 ? "rare" : "common";
  return "common";
}

function statsFromPosition(position, rating, rng) {
  const pos = String(position || "").toUpperCase();
  const base = clamp(rating, 60, 92);
  const jitter = () => Math.round((rng() - 0.5) * 10);

  const mk = (paceW, shootW, passW, defW) => ({
    pace: clamp(Math.round(base + paceW + jitter()), 35, 99),
    shooting: clamp(Math.round(base + shootW + jitter()), 35, 99),
    passing: clamp(Math.round(base + passW + jitter()), 35, 99),
    defense: clamp(Math.round(base + defW + jitter()), 35, 99),
  });

  if (pos === "GK") return mk(-18, -25, -10, 18);
  if (["CB", "LCB", "RCB"].includes(pos)) return mk(-10, -18, -10, 16);
  if (["LB", "RB", "LWB", "RWB"].includes(pos)) return mk(6, -10, -4, 8);
  if (["CDM", "LDM", "RDM"].includes(pos)) return mk(-2, -8, 8, 6);
  if (["CM", "LCM", "RCM"].includes(pos)) return mk(0, -2, 10, 0);
  if (["CAM", "LAM", "RAM"].includes(pos)) return mk(6, 8, 10, -10);
  if (["LW", "RW"].includes(pos)) return mk(12, 8, 2, -14);
  return mk(8, 10, 0, -16);
}

function expandTeamRoster(teamName, tier, basePlayers) {
  const positions = ["GK", "RB", "LB", "CB", "CB", "CDM", "CM", "CAM", "RW", "LW", "ST", "ST2", "RCM", "LCM", "RCB", "LCB"];
  const existingByPos = new Map();
  const out = [...basePlayers];
  for (const p of basePlayers) {
    existingByPos.set(String(p.pos).toUpperCase(), p);
  }

  const tierBase = tier === "Top" ? 78 : tier === "Mid" ? 71 : 66;
  const tierCeil = tier === "Top" ? 86 : tier === "Mid" ? 79 : 74;

  const seed = Math.abs(
    Array.from(String(teamName))
      .map((c) => c.charCodeAt(0))
      .reduce((a, b) => a * 31 + b, 7)
  );
  const rng = xorshift32(seed);

  const firstNames = ["Ahmed", "Omar", "Mostafa", "Karim", "Hossam", "Mahmoud", "Youssef", "Tarek", "Fady", "Hany", "Ali", "Sherif", "Ramy", "Adel", "Khaled", "Samy"];
  const lastNames = ["Hassan", "Fathy", "Nabil", "Samir", "Farouk", "Gamal", "Ragab", "Hamdy", "Saber", "Kamel", "Yassin", "Magdy", "Mokhtar", "Abdelaziz", "Ramadan", "Galal"];

  for (let i = 0; i < positions.length; i += 1) {
    const pos = positions[i];
    if (existingByPos.has(pos)) continue;
    const fn = firstNames[Math.floor(rng() * firstNames.length)];
    const ln = lastNames[Math.floor(rng() * lastNames.length)];
    const rating = clamp(Math.round(tierBase + rng() * (tierCeil - tierBase)), 60, 90);
    const name = `${fn} ${ln} ${teamName.split(" ")[0]}`;
    out.push({ name, pos, rating });
  }
  return out;
}

async function seedEgyptLeagueTemplates() {
  const exists = await PlayerTemplate.exists({ "source.leagueKey": LEAGUE_KEY, "source.seedVersion": SEED_VERSION, isActive: true });
  if (exists) return { inserted: 0, leagueKey: LEAGUE_KEY };

  const templates = [];
  for (const t of EGYPT_LEAGUE_TEAMS) {
    const roster = expandTeamRoster(t.team, t.tier, t.players);
    for (const p of roster) {
      const externalSeed = Math.abs(
        Array.from(`${t.team}:${p.name}:${p.pos}:${p.rating}`)
          .map((c) => c.charCodeAt(0))
          .reduce((a, b) => a * 33 + b, 11)
      );
      const rng = xorshift32(externalSeed);
      const rarity = rarityFromRating(p.rating, rng);
      const stats = statsFromPosition(p.pos, p.rating, rng);
      const portraitKey = PORTRAIT_KEYS[Math.floor(rng() * PORTRAIT_KEYS.length)];
      const templateKey = `${rarity}:${LEAGUE_KEY}:${slugify(p.name)}`;
      templates.push({
        templateKey,
        source: { provider: "local", leagueKey: LEAGUE_KEY, teamName: t.team, season: 2023, seedVersion: SEED_VERSION },
        name: p.name,
        position: String(p.pos || "").toUpperCase(),
        nation: "Egypt",
        clubName: t.team,
        imageUrl: null,
        assets: { portraitKey, cardFrameKey: null, kitKey: null, logoKey: null },
        rating: p.rating,
        rarity,
        stats,
        isActive: true,
      });
    }
  }

  const ops = templates.map((doc) => ({
    updateOne: {
      filter: { templateKey: doc.templateKey },
      update: { $set: doc },
      upsert: true,
    },
  }));
  const res = await PlayerTemplate.bulkWrite(ops);
  await invalidateTemplatePoolCache();
  return { inserted: (res.upsertedCount || 0) + (res.modifiedCount || 0), leagueKey: LEAGUE_KEY };
}

module.exports = { seedEgyptLeagueTemplates };

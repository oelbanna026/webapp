const { PlayerTemplate } = require("../models/PlayerTemplate");
const { slugify } = require("../utils/playerPool");
const { getPlayers } = require("./footballService");

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
  if (r >= 90) return rng() < 0.65 ? "legendary" : "epic";
  if (r >= 84) return rng() < 0.55 ? "epic" : "rare";
  if (r >= 78) return rng() < 0.45 ? "rare" : "common";
  return "common";
}

function statsFromPosition(position, rating, rng) {
  const pos = String(position || "").toUpperCase();
  const base = clamp(rating, 60, 92);
  const jitter = () => Math.round((rng() - 0.5) * 12);

  const mk = (paceW, shootW, passW, defW) => ({
    pace: clamp(Math.round(base + paceW + jitter()), 35, 99),
    shooting: clamp(Math.round(base + shootW + jitter()), 35, 99),
    passing: clamp(Math.round(base + passW + jitter()), 35, 99),
    defense: clamp(Math.round(base + defW + jitter()), 35, 99),
  });

  if (pos.includes("GK")) return mk(-18, -25, -10, 18);
  if (pos.includes("DEF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB")) return mk(-6, -18, -10, 12);
  if (pos.includes("MID") || pos.includes("DM") || pos.includes("AM")) return mk(-2, -6, 8, -2);
  return mk(10, 10, -2, -18);
}

function ratingFromApi(apiItem, rng) {
  const stats = apiItem?.statistics?.[0] || {};
  const games = stats?.games || {};
  const goals = stats?.goals || {};
  const passes = stats?.passes || {};
  const tackles = stats?.tackles || {};

  const minutes = Number(games?.minutes || 0);
  const appearances = Number(games?.appearences || games?.appearances || 0);
  const goalsTotal = Number(goals?.total || 0);
  const assists = Number(goals?.assists || 0);
  const passAcc = Number(passes?.accuracy || 0);
  const tacklesTotal = Number(tackles?.total || 0);
  const interceptions = Number(tackles?.interceptions || 0);

  const minsScore = clamp(minutes / 1800, 0, 1) * 10;
  const appScore = clamp(appearances / 25, 0, 1) * 8;
  const gScore = clamp(goalsTotal / 15, 0, 1) * 14;
  const aScore = clamp(assists / 10, 0, 1) * 10;
  const pScore = clamp(passAcc / 90, 0, 1) * 10;
  const dScore = clamp((tacklesTotal + interceptions) / 120, 0, 1) * 10;

  const noise = (rng() - 0.5) * 6;
  return clamp(Math.round(62 + minsScore + appScore + gScore + aScore + pScore + dScore + noise), 60, 94);
}

function transformPlayer(apiItem, { leagueId, teamId, season }) {
  const externalPlayerId = Number(apiItem?.player?.id || 0) || null;
  const name = String(apiItem?.player?.name || "").trim();
  const position = apiItem?.statistics?.[0]?.games?.position || null;
  const nation = apiItem?.player?.nationality || null;
  const clubName = apiItem?.statistics?.[0]?.team?.name || null;
  const imageUrl = apiItem?.player?.photo || null;

  const rng = xorshift32(externalPlayerId || Math.floor(Math.random() * 2 ** 31));
  const rating = ratingFromApi(apiItem, rng);
  const rarity = rarityFromRating(rating, rng);
  const stats = statsFromPosition(position, rating, rng);

  const templateKey = `${rarity}:api-${externalPlayerId || slugify(name)}`;

  return {
    templateKey,
    source: { provider: "api-football", leagueId, teamId, season, externalPlayerId },
    name,
    position,
    nation,
    clubName,
    imageUrl,
    rating,
    rarity,
    stats,
    isActive: true,
  };
}

async function importTeamPlayers({ leagueId = null, teamId, season }) {
  const out = { season, teamId, leagueId, fetched: 0, upserted: 0, templates: [] };
  let page = 1;
  for (;;) {
    const data = await getPlayers({ teamId, season, page });
    const items = data?.response || [];
    out.fetched += items.length;

    const transformed = items
      .map((it) => transformPlayer(it, { leagueId, teamId, season }))
      .filter((t) => t.name && t.templateKey && t.source.externalPlayerId);

    if (transformed.length > 0) {
      const ops = transformed.map((t) => ({
        updateOne: {
          filter: { templateKey: t.templateKey },
          update: { $set: t },
          upsert: true,
        },
      }));
      const res = await PlayerTemplate.bulkWrite(ops);
      out.upserted += (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);
      out.templates.push(...transformed.map((t) => ({ templateKey: t.templateKey, name: t.name, rating: t.rating, rarity: t.rarity })));
    }

    const paging = data?.paging || {};
    const totalPages = Number(paging?.total || 1);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
    page += 1;
  }
  return out;
}

module.exports = { importTeamPlayers };


const { PlayerTemplate } = require("../models/PlayerTemplate");
const { getRedisClient } = require("../config/redisClient");
const { getContentConfig } = require("../config/content");

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_TTL_SEC = Math.floor(CACHE_TTL_MS / 1000);
const RARITIES = ["common", "rare", "epic", "legendary"];

let cache = {
  at: 0,
  byRarity: new Map(),
};

async function invalidateTemplatePoolCache() {
  cache = { at: 0, byRarity: new Map() };
  const redis = await getRedisClient();
  if (!redis) return;
  const keys = [];
  for (const r of RARITIES) {
    keys.push(`tplpool:${r}`);
    keys.push(`tplpool:${r}:l*`);
  }
  const expanded = [];
  for (const k of keys) {
    if (k.endsWith("*")) {
      const found = await redis.keys(k);
      expanded.push(...found);
    } else {
      expanded.push(k);
    }
  }
  if (expanded.length) await redis.del(expanded);
}

async function getTemplatePoolForRarity(rarity) {
  const cfg = getContentConfig();
  const suffix = cfg.leagueIds.length ? `:l${cfg.leagueIds.join(",")}` : "";
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS && cache.byRarity.has(rarity)) return cache.byRarity.get(rarity);

  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(`tplpool:${rarity}${suffix}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      cache.at = now;
      cache.byRarity.set(rarity, parsed);
      return parsed;
    }
  }

  const query = { rarity, isActive: true };
  if (cfg.leagueIds.length) query["source.leagueId"] = { $in: cfg.leagueIds };
  const rows = await PlayerTemplate.find(query).sort({ rating: -1, name: 1 }).limit(300);
  cache.at = now;
  const mapped = rows.map((r) => r.toObject());
  cache.byRarity.set(rarity, mapped);
  if (redis) await redis.set(`tplpool:${rarity}${suffix}`, JSON.stringify(mapped), { EX: CACHE_TTL_SEC });
  return mapped;
}

module.exports = { getTemplatePoolForRarity, invalidateTemplatePoolCache };

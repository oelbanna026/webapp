const { PlayerTemplate } = require("../models/PlayerTemplate");
const { getRedisClient } = require("../config/redisClient");

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
  const keys = RARITIES.map((r) => `tplpool:${r}`);
  await redis.del(keys);
}

async function getTemplatePoolForRarity(rarity) {
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS && cache.byRarity.has(rarity)) return cache.byRarity.get(rarity);

  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(`tplpool:${rarity}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      cache.at = now;
      cache.byRarity.set(rarity, parsed);
      return parsed;
    }
  }

  const rows = await PlayerTemplate.find({ rarity, isActive: true }).sort({ rating: -1, name: 1 }).limit(300);
  cache.at = now;
  const mapped = rows.map((r) => r.toObject());
  cache.byRarity.set(rarity, mapped);
  if (redis) await redis.set(`tplpool:${rarity}`, JSON.stringify(mapped), { EX: CACHE_TTL_SEC });
  return mapped;
}

module.exports = { getTemplatePoolForRarity, invalidateTemplatePoolCache };

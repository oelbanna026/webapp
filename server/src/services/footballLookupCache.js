const { getRedisClient } = require("../config/redisClient");

const FALLBACK_TTL_MS = 60 * 60 * 1000;

let memory = new Map();

function memGet(key) {
  const v = memory.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) {
    memory.delete(key);
    return null;
  }
  return v.value;
}

function memSet(key, value, ttlMs) {
  memory.set(key, { value, exp: Date.now() + ttlMs });
}

async function getCachedJson(key) {
  const redis = await getRedisClient();
  if (redis) {
    const v = await redis.get(key);
    if (!v) return null;
    return JSON.parse(v);
  }
  return memGet(key);
}

async function setCachedJson(key, value, ttlSec) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { EX: ttlSec });
    return;
  }
  memSet(key, value, Math.max(1, ttlSec) * 1000);
}

function clearLookupCache() {
  memory = new Map();
}

module.exports = { getCachedJson, setCachedJson, clearLookupCache, FALLBACK_TTL_MS };


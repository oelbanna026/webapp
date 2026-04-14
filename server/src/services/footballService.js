const axios = require("axios");
const { createHttpError } = require("../utils/createHttpError");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getApi() {
  const baseURL = (process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io").replace(/\/+$/, "");
  const apiKey = process.env.API_FOOTBALL_API_KEY || "";
  if (!apiKey) throw createHttpError(500, "API_FOOTBALL_API_KEY is not configured");
  return axios.create({
    baseURL,
    headers: {
      "x-apisports-key": apiKey,
    },
    timeout: 15000,
  });
}

async function getWithRetry(api, url, config) {
  const max = 4;
  let lastErr = null;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try {
      return await api.get(url, config);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const retryAfter = Number(err?.response?.headers?.["retry-after"] || 0);
      const shouldRetry = status === 429 || status === 503 || status === 504;
      if (!shouldRetry || attempt === max) break;
      const base = retryAfter > 0 ? retryAfter * 1000 : 600 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(base + jitter);
    }
  }
  throw lastErr;
}

async function getTeams({ leagueId, season }) {
  const api = getApi();
  const res = await getWithRetry(api, "/teams", { params: { league: leagueId, season } });
  return res.data?.response || [];
}

async function getLeagues({ season }) {
  const api = getApi();
  const res = await getWithRetry(api, "/leagues", { params: { season } });
  return res.data?.response || [];
}

async function getPlayers({ teamId, season, page = 1 }) {
  const api = getApi();
  const res = await getWithRetry(api, "/players", { params: { team: teamId, season, page } });
  return res.data || {};
}

module.exports = { getTeams, getLeagues, getPlayers };

const axios = require("axios");
const { createHttpError } = require("../utils/createHttpError");

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

async function getTeams({ leagueId, season }) {
  const api = getApi();
  const res = await api.get("/teams", { params: { league: leagueId, season } });
  return res.data?.response || [];
}

async function getLeagues({ season }) {
  const api = getApi();
  const res = await api.get("/leagues", { params: { season } });
  return res.data?.response || [];
}

async function getPlayers({ teamId, season, page = 1 }) {
  const api = getApi();
  const res = await api.get("/players", { params: { team: teamId, season, page } });
  return res.data || {};
}

module.exports = { getTeams, getLeagues, getPlayers };

const { LEAGUE_KEY: EGYPT_KEY, EGYPT_LEAGUE_TEAMS } = require("./egyptLeague");

function getLeagueTeams(leagueKey) {
  const key = String(leagueKey || "").trim().toLowerCase();
  if (key === EGYPT_KEY) return EGYPT_LEAGUE_TEAMS;
  return [];
}

function findTeam(leagueKey, teamName) {
  const teams = getLeagueTeams(leagueKey);
  const name = String(teamName || "").trim();
  return teams.find((t) => t.team === name) || null;
}

module.exports = { getLeagueTeams, findTeam };


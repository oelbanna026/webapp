function parseIntList(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function getContentConfig() {
  const leagueIds = parseIntList(process.env.CONTENT_LEAGUE_IDS);
  const season = Number(process.env.CONTENT_SEASON || 2023);
  const bootstrapLeagueId = process.env.BOOTSTRAP_LEAGUE_ID ? Number(process.env.BOOTSTRAP_LEAGUE_ID) : null;
  const bootstrapSeason = Number(process.env.BOOTSTRAP_SEASON || season);
  const bootstrapLimit = process.env.BOOTSTRAP_TEAM_LIMIT ? Number(process.env.BOOTSTRAP_TEAM_LIMIT) : null;
  const enableScouting = String(process.env.ENABLE_SCOUTING || "").toLowerCase() === "true";

  const normalizedBootstrapLeagueId = Number.isFinite(bootstrapLeagueId) ? bootstrapLeagueId : null;
  const effectiveLeagueIds = leagueIds.length ? leagueIds : normalizedBootstrapLeagueId ? [normalizedBootstrapLeagueId] : [];

  return {
    leagueIds: effectiveLeagueIds,
    season: Number.isFinite(season) ? season : 2023,
    bootstrap: {
      leagueId: normalizedBootstrapLeagueId,
      season: Number.isFinite(bootstrapSeason) ? bootstrapSeason : 2023,
      limit: bootstrapLimit === null ? null : Number.isFinite(bootstrapLimit) ? bootstrapLimit : null,
    },
    enableScouting,
  };
}

module.exports = { getContentConfig };

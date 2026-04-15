function parseList(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(String);
}

function getContentConfig() {
  const leagueKeys = parseList(process.env.CONTENT_LEAGUE_KEYS || process.env.CONTENT_LEAGUE_KEY || "egypt");
  const enableScouting = String(process.env.ENABLE_SCOUTING || "").toLowerCase() === "true";

  return {
    leagueKeys,
    enableScouting,
  };
}

module.exports = { getContentConfig };

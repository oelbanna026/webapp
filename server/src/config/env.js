function getEnv() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const port = Number(process.env.PORT || 4000);
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stadium_os";
  const jwtSecret = process.env.JWT_SECRET || "dev_only_change_me";
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  const googleAiStudioApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || "";
  const apiFootballBaseUrl = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
  const apiFootballApiKey = process.env.API_FOOTBALL_API_KEY || "";
  const allowFootballImport = String(process.env.ALLOW_FOOTBALL_IMPORT || "").toLowerCase() === "true";
  const redisUrl = process.env.REDIS_URL || "";
  const footballImportCron = process.env.FOOTBALL_IMPORT_CRON || "";
  const footballImportTeamIds = process.env.FOOTBALL_IMPORT_TEAM_IDS || "";

  return {
    nodeEnv,
    port,
    mongoUri,
    jwtSecret,
    jwtExpiresIn,
    corsOrigin,
    googleAiStudioApiKey,
    apiFootballBaseUrl,
    apiFootballApiKey: apiFootballApiKey ? "configured" : "",
    allowFootballImport,
    redisUrl: redisUrl ? "configured" : "",
    footballImportCron,
    footballImportTeamIds,
  };
}

module.exports = { getEnv };

require("dotenv").config();

const { connectToDatabase } = require("../src/config/db");
const { getEnv } = require("../src/config/env");
const { importTeamPlayers } = require("../src/services/footballImportService");
const { invalidateTemplatePoolCache } = require("../src/services/templatePoolService");

async function main() {
  const env = getEnv();
  await connectToDatabase(env.mongoUri);

  const teamId = Number(process.argv[2]);
  const season = Number(process.argv[3] || 2023);
  const leagueId = process.argv[4] ? Number(process.argv[4]) : null;
  if (!Number.isFinite(teamId) || teamId <= 0) throw new Error("Usage: node scripts/importApiFootballTeam.js <teamId> [season] [leagueId]");

  const result = await importTeamPlayers({ leagueId, teamId, season });
  await invalidateTemplatePoolCache();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err?.message || String(err)}\n`);
  process.exit(1);
});

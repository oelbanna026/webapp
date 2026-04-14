const cron = require("node-cron");
const { importTeamPlayers } = require("../services/footballImportService");
const { invalidateTemplatePoolCache } = require("../services/templatePoolService");

function parseTeamIds(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function startFootballImportCron() {
  const enabled = String(process.env.ALLOW_FOOTBALL_IMPORT || "").toLowerCase() === "true";
  if (!enabled) return null;

  const cronExpr = process.env.FOOTBALL_IMPORT_CRON || "0 3 * * *";
  const teamIds = parseTeamIds(process.env.FOOTBALL_IMPORT_TEAM_IDS);
  const season = Number(process.env.FOOTBALL_IMPORT_SEASON || 2023);
  const leagueId = process.env.FOOTBALL_IMPORT_LEAGUE_ID ? Number(process.env.FOOTBALL_IMPORT_LEAGUE_ID) : null;

  if (teamIds.length === 0) return null;
  if (!Number.isFinite(season) || season < 2000 || season > 2100) return null;
  if (!cron.validate(cronExpr)) return null;

  const task = cron.schedule(cronExpr, async () => {
    for (const teamId of teamIds) {
      try {
        const r = await importTeamPlayers({ leagueId, teamId, season });
        await invalidateTemplatePoolCache();
        process.stdout.write(`[import] api-football team=${teamId} season=${season} fetched=${r.fetched} upserted=${r.upserted}\n`);
      } catch (err) {
        process.stderr.write(`[import] api-football team=${teamId} failed: ${err?.message || String(err)}\n`);
      }
    }
  });

  task.start();
  return task;
}

module.exports = { startFootballImportCron };


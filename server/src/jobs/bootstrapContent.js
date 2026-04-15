const { PlayerTemplate } = require("../models/PlayerTemplate");
const { getContentConfig } = require("../config/content");
const { getTeams } = require("../services/footballService");
const { importTeamPlayers } = require("../services/footballImportService");
const { invalidateTemplatePoolCache } = require("../services/templatePoolService");

function isImportEnabled() {
  return String(process.env.ALLOW_FOOTBALL_IMPORT || "").toLowerCase() === "true";
}

async function bootstrapLeagueTemplates() {
  const cfg = getContentConfig();
  if (!cfg.bootstrap.leagueId) return;
  if (!isImportEnabled()) return;

  const existing = await PlayerTemplate.exists({ isActive: true });
  if (existing) return;

  const leagueId = cfg.bootstrap.leagueId;
  const season = cfg.bootstrap.season;
  const limit = cfg.bootstrap.limit;

  process.stdout.write(`[bootstrap] importing league=${leagueId} season=${season}\n`);

  const teams = await getTeams({ leagueId, season });
  const teamIds = teams
    .map((t) => Number(t?.team?.id))
    .filter((n) => Number.isFinite(n) && n > 0);

  const selected = limit ? teamIds.slice(0, limit) : teamIds;
  for (let i = 0; i < selected.length; i += 1) {
    const teamId = selected[i];
    try {
      const r = await importTeamPlayers({ leagueId, teamId, season });
      await invalidateTemplatePoolCache();
      process.stdout.write(`[bootstrap] team=${teamId} fetched=${r.fetched} upserted=${r.upserted}\n`);
    } catch (err) {
      process.stderr.write(`[bootstrap] team=${teamId} failed: ${err?.message || String(err)}\n`);
    }
    if (i < selected.length - 1) await new Promise((r) => setTimeout(r, 450));
  }
}

module.exports = { bootstrapLeagueTemplates };


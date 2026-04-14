const { createHttpError } = require("../utils/createHttpError");
const { importTeamPlayers } = require("../services/footballImportService");
const { invalidateTemplatePoolCache } = require("../services/templatePoolService");
const { getTeams, getLeagues } = require("../services/footballService");
const { getCachedJson, setCachedJson } = require("../services/footballLookupCache");
const { createJob, getJob, pushJobResult, updateJob } = require("../services/importJobService");

function ensureImportEnabled() {
  const enabled = String(process.env.ALLOW_FOOTBALL_IMPORT || "").toLowerCase() === "true";
  if (!enabled) throw createHttpError(403, "Import is disabled");
}

async function importFootballTeam(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    ensureImportEnabled();

    const teamId = Number(req.params.teamId);
    const season = Number(req.query.season || 2023);
    const leagueId = req.query.leagueId ? Number(req.query.leagueId) : null;
    if (!Number.isFinite(teamId) || teamId <= 0) throw createHttpError(400, "Invalid teamId");
    if (!Number.isFinite(season) || season < 2000 || season > 2100) throw createHttpError(400, "Invalid season");

    const result = await importTeamPlayers({ leagueId, teamId, season });
    await invalidateTemplatePoolCache();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listFootballLeagues(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    ensureImportEnabled();

    const season = Number(req.query.season || 2023);
    if (!Number.isFinite(season) || season < 2000 || season > 2100) throw createHttpError(400, "Invalid season");

    const cacheKey = `football:leagues:${season}`;
    const cached = await getCachedJson(cacheKey);
    if (cached) return res.json({ season, leagues: cached });

    const leagues = await getLeagues({ season });
    const trimmed = leagues.map((x) => ({
      league: { id: x.league?.id, name: x.league?.name, type: x.league?.type, logo: x.league?.logo },
      country: { name: x.country?.name, code: x.country?.code, flag: x.country?.flag },
    }));
    await setCachedJson(cacheKey, trimmed, 24 * 60 * 60);
    res.json({ season, leagues: trimmed });
  } catch (err) {
    next(err);
  }
}

async function listFootballTeams(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    ensureImportEnabled();

    const leagueId = Number(req.query.leagueId);
    const season = Number(req.query.season || 2023);
    if (!Number.isFinite(leagueId) || leagueId <= 0) throw createHttpError(400, "Invalid leagueId");
    if (!Number.isFinite(season) || season < 2000 || season > 2100) throw createHttpError(400, "Invalid season");

    const cacheKey = `football:teams:${leagueId}:${season}`;
    const cached = await getCachedJson(cacheKey);
    if (cached) return res.json({ season, leagueId, teams: cached });

    const teams = await getTeams({ leagueId, season });
    const trimmed = teams.map((x) => ({
      team: { id: x.team?.id, name: x.team?.name, logo: x.team?.logo, country: x.team?.country, founded: x.team?.founded },
      venue: { name: x.venue?.name, city: x.venue?.city, capacity: x.venue?.capacity },
    }));
    await setCachedJson(cacheKey, trimmed, 24 * 60 * 60);
    res.json({ season, leagueId, teams: trimmed });
  } catch (err) {
    next(err);
  }
}

async function importFootballLeague(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    ensureImportEnabled();

    const leagueId = Number(req.params.leagueId);
    const season = Number(req.query.season || 2023);
    const limit = req.query.limit === undefined ? null : Number(req.query.limit);

    if (!Number.isFinite(leagueId) || leagueId <= 0) throw createHttpError(400, "Invalid leagueId");
    if (!Number.isFinite(season) || season < 2000 || season > 2100) throw createHttpError(400, "Invalid season");
    if (limit !== null && (!Number.isFinite(limit) || limit < 0 || limit > 200)) throw createHttpError(400, "Invalid limit");

    const job = createJob({ type: "import.football.league", meta: { leagueId, season, limit } });
    res.json({ jobId: job.id });

    setImmediate(async () => {
      updateJob(job.id, { status: "running", startedAt: new Date().toISOString() });
      try {
        const cacheKey = `football:teams:${leagueId}:${season}`;
        const cached = await getCachedJson(cacheKey);
        const teamRows = cached || (await getTeams({ leagueId, season }));
        if (!cached) {
          const trimmed = teamRows.map((x) => ({
            team: { id: x.team?.id, name: x.team?.name, logo: x.team?.logo, country: x.team?.country, founded: x.team?.founded },
            venue: { name: x.venue?.name, city: x.venue?.city, capacity: x.venue?.capacity },
          }));
          await setCachedJson(cacheKey, trimmed, 24 * 60 * 60);
        }

        const ids = teamRows
          .map((t) => Number(t?.team?.id))
          .filter((n) => Number.isFinite(n) && n > 0);
        const selected = limit === null ? ids : ids.slice(0, limit);
        updateJob(job.id, { progress: { done: 0, total: selected.length } });

        if (selected.length === 0) {
          updateJob(job.id, {
            status: "failed",
            finishedAt: new Date().toISOString(),
            error: `No teams found for leagueId=${leagueId} season=${season}`,
          });
          return;
        }

        let errors = 0;
        for (let i = 0; i < selected.length; i += 1) {
          const teamId = selected[i];
          try {
            const r = await importTeamPlayers({ leagueId, teamId, season });
            await invalidateTemplatePoolCache();
            pushJobResult(job.id, { teamId, fetched: r.fetched, upserted: r.upserted, ok: true });
          } catch (err) {
            errors += 1;
            pushJobResult(job.id, { teamId, ok: false, error: err?.message || String(err) });
          }
          updateJob(job.id, { progress: { done: i + 1, total: selected.length } });
          if (i < selected.length - 1) await new Promise((r) => setTimeout(r, 350));
        }

        updateJob(job.id, {
          status: errors > 0 ? "completed_with_errors" : "completed",
          finishedAt: new Date().toISOString(),
          error: errors > 0 ? `${errors} team imports failed` : null,
        });
      } catch (err) {
        updateJob(job.id, { status: "failed", finishedAt: new Date().toISOString(), error: err?.message || String(err) });
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getImportJob(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    ensureImportEnabled();
    const job = getJob(req.params.jobId);
    if (!job) throw createHttpError(404, "Job not found");
    res.json(job);
  } catch (err) {
    next(err);
  }
}

module.exports = { importFootballTeam, listFootballLeagues, listFootballTeams, importFootballLeague, getImportJob };


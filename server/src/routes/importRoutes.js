const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { requireAdminSecret } = require("../middleware/requireAdminSecret");
const { importFootballLeague, importFootballTeam, listFootballLeagues, listFootballTeams, getImportJob } = require("../controllers/importController");

const importRouter = express.Router();

importRouter.get("/football/leagues", requireAuth, requireAdminSecret, listFootballLeagues);
importRouter.get("/football/teams", requireAuth, requireAdminSecret, listFootballTeams);
importRouter.post("/football/team/:teamId", requireAuth, requireAdminSecret, importFootballTeam);
importRouter.post("/football/league/:leagueId", requireAuth, requireAdminSecret, importFootballLeague);
importRouter.get("/jobs/:jobId", requireAuth, requireAdminSecret, getImportJob);

module.exports = { importRouter };

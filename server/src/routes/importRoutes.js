const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { importFootballLeague, importFootballTeam, listFootballLeagues, listFootballTeams, getImportJob } = require("../controllers/importController");

const importRouter = express.Router();

importRouter.get("/football/leagues", requireAuth, listFootballLeagues);
importRouter.get("/football/teams", requireAuth, listFootballTeams);
importRouter.post("/football/team/:teamId", requireAuth, importFootballTeam);
importRouter.post("/football/league/:leagueId", requireAuth, importFootballLeague);
importRouter.get("/jobs/:jobId", requireAuth, getImportJob);

module.exports = { importRouter };

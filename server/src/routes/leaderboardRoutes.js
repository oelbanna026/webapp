const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { getGlobalLeaderboard } = require("../controllers/leaderboardController");

const leaderboardRouter = express.Router();

leaderboardRouter.get("/", requireAuth, getGlobalLeaderboard);

module.exports = { leaderboardRouter };

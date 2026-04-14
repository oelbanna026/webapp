const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { listPlayers } = require("../controllers/playerController");
const { upgradePlayer } = require("../controllers/progressionController");

const playerRouter = express.Router();

playerRouter.get("/", requireAuth, listPlayers);
playerRouter.post("/:id/upgrade", requireAuth, upgradePlayer);

module.exports = { playerRouter };

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { getMySquad, saveMySquad } = require("../controllers/squadController");

const squadRouter = express.Router();

squadRouter.get("/", requireAuth, getMySquad);
squadRouter.put("/", requireAuth, saveMySquad);

module.exports = { squadRouter };

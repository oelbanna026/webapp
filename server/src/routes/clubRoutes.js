const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { checkName, createClub, getMyClub, updateCoach } = require("../controllers/clubController");

const clubRouter = express.Router();

clubRouter.get("/check-name", requireAuth, checkName);
clubRouter.get("/me", requireAuth, getMyClub);
clubRouter.post("/", requireAuth, createClub);
clubRouter.patch("/me/coach", requireAuth, updateCoach);

module.exports = { clubRouter };

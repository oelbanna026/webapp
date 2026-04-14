const express = require("express");
const { getMe, setCoins } = require("../controllers/userController");
const { requireAuth } = require("../middleware/requireAuth");
const { getWallet } = require("../controllers/walletController");
const { claimDaily } = require("../controllers/rewardController");
const { claimMyMission, getMyMissions } = require("../controllers/missionController");
const { getMyEconomy } = require("../controllers/economyController");

const userRouter = express.Router();

userRouter.get("/me", requireAuth, getMe);
userRouter.get("/me/wallet", requireAuth, getWallet);
userRouter.get("/me/economy", requireAuth, getMyEconomy);
userRouter.post("/me/rewards/daily", requireAuth, claimDaily);
userRouter.get("/me/missions", requireAuth, getMyMissions);
userRouter.post("/me/missions/claim", requireAuth, claimMyMission);
userRouter.put("/me/coins", requireAuth, setCoins);

module.exports = { userRouter };

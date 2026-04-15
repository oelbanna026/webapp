const express = require("express");
const { authRouter } = require("./authRoutes");
const { userRouter } = require("./userRoutes");
const { squadRouter } = require("./squadRoutes");
const { playerRouter } = require("./playerRoutes");
const { marketRouter } = require("./marketRoutes");
const { matchRouter } = require("./matchRoutes");
const { leaderboardRouter } = require("./leaderboardRoutes");
const { packRouter } = require("./packRoutes");
const { clubRouter } = require("./clubRoutes");
const { aiRouter } = require("./aiRoutes");
const { eventRouter } = require("./eventRoutes");
const { importRouter } = require("./importRoutes");
const { scoutingRouter } = require("./scoutingRoutes");
const { getContentConfig } = require("../config/content");

const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/squad", squadRouter);
apiRouter.use("/players", playerRouter);
apiRouter.use("/market", marketRouter);
apiRouter.use("/matches", matchRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/packs", packRouter);
apiRouter.use("/clubs", clubRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/events", eventRouter);
apiRouter.use("/import", importRouter);
if (getContentConfig().enableScouting) apiRouter.use("/scouting", scoutingRouter);

module.exports = { apiRouter };

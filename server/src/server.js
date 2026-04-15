const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectToDatabase } = require("./config/db");
const { getEnv } = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");
const { apiRouter } = require("./routes");
const { ensurePlayersSeeded } = require("./utils/seedPlayers");
const { startAuctionScheduler } = require("./realtime/auctionScheduler");
const { seedMarketListings } = require("./jobs/marketSeed");
const { seedEgyptLeagueTemplates } = require("./jobs/seedLocalLeague");
const { migrateEgyptContent } = require("./jobs/migrateEgyptContent");

async function createServer() {
  const env = getEnv();
  await connectToDatabase(env.mongoUri);
  if (env.nodeEnv !== "production") await ensurePlayersSeeded();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", apiRouter);
  startAuctionScheduler();
  setImmediate(() => {
    migrateEgyptContent()
      .then(() => seedEgyptLeagueTemplates())
      .then(() => seedMarketListings())
      .catch(() => void 0);
  });

  app.use(notFound);
  app.use(errorHandler);

  return { app, env };
}

module.exports = { createServer };

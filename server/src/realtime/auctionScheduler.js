const { finalizeExpiredAuctions } = require("../services/marketService");
const { listingDTO } = require("../utils/marketDto");
const { marketBus } = require("./marketBus");

function startAuctionScheduler({ intervalMs = 2000 } = {}) {
  const timer = setInterval(async () => {
    try {
      const finalized = await finalizeExpiredAuctions({ limit: 25 });
      for (const listing of finalized) {
        marketBus.emit("market.upsert", listingDTO(listing));
      }
    } catch {
      return;
    }
  }, intervalMs);

  timer.unref?.();

  return () => clearInterval(timer);
}

module.exports = { startAuctionScheduler };


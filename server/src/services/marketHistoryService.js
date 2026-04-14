const { MarketPriceHistory } = require("../models/MarketPriceHistory");

function dayKey(d = new Date()) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function recordSale({ templateKey, rarity, price, at = new Date() }, session) {
  if (!templateKey || !rarity || !Number.isFinite(Number(price))) return;
  const day = dayKey(at);
  const update = {
    $inc: { count: 1, sumPrice: Math.max(0, Math.floor(Number(price))) },
    $set: { rarity, lastPrice: Math.max(0, Math.floor(Number(price))) },
    $setOnInsert: { day, templateKey, minPrice: Math.max(0, Math.floor(Number(price))), maxPrice: Math.max(0, Math.floor(Number(price))) },
    $min: { minPrice: Math.max(0, Math.floor(Number(price))) },
    $max: { maxPrice: Math.max(0, Math.floor(Number(price))) },
  };

  const q = MarketPriceHistory.findOneAndUpdate({ day, templateKey }, update, { upsert: true, new: true });
  if (session) await q.session(session);
  else await q;
}

async function getHistory({ templateKey, days = 7 }) {
  const lim = Math.max(1, Math.min(30, Math.floor(Number(days) || 7)));
  const rows = await MarketPriceHistory.find({ templateKey }).sort({ day: -1 }).limit(lim);
  return rows.map((r) => {
    const avg = r.count > 0 ? Math.round(r.sumPrice / r.count) : 0;
    return {
      day: r.day,
      rarity: r.rarity,
      count: r.count,
      avgPrice: avg,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
      lastPrice: r.lastPrice,
    };
  });
}

module.exports = { recordSale, getHistory };


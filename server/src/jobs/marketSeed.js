const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User } = require("../models/User");
const { Player } = require("../models/Player");
const { MarketListing } = require("../models/MarketListing");
const { getTemplatePoolForRarity } = require("../services/templatePoolService");
const { templateKeyFor } = require("../utils/playerPool");

function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  const i = Math.floor(v);
  return Math.max(min, Math.min(max, i));
}

function rarityMult(rarity) {
  if (rarity === "legendary") return 5.0;
  if (rarity === "epic") return 2.6;
  if (rarity === "rare") return 1.4;
  return 1.0;
}

function priceForTemplate(t) {
  const rating = Number(t?.rating) || 0;
  const base = Math.max(250, Math.round((rating ** 2) * 1.4 * rarityMult(String(t?.rarity || "common"))));
  return Math.max(200, Math.round(base / 50) * 50);
}

async function ensureMarketBot() {
  const email = "marketbot@stadium-os.local";
  const username = "MarketBot";
  let bot = await User.findOne({ email });
  if (bot) return bot;
  const passwordHash = await bcrypt.hash(String(Math.random()), 10);
  bot = await User.create({ username, email, passwordHash, coins: 0 });
  return bot;
}

async function seedMarketListings() {
  const enabled = String(process.env.SEED_MARKET || "").toLowerCase() === "true";
  if (!enabled) return;

  const target = clampInt(process.env.MARKET_SEED_TARGET || 30, 0, 200);
  if (target <= 0) return;

  const activeCount = await MarketListing.countDocuments({ status: "active" });
  if (activeCount >= target) return;

  const bot = await ensureMarketBot();
  const needed = target - activeCount;

  const rarities = ["common", "rare", "epic", "legendary"];
  const weights = [0.6, 0.28, 0.1, 0.02];
  const pickRarity = () => {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < rarities.length; i += 1) {
      acc += weights[i];
      if (r <= acc) return rarities[i];
    }
    return "common";
  };

  for (let i = 0; i < needed; i += 1) {
    const rarity = pickRarity();
    const pool = await getTemplatePoolForRarity(rarity);
    if (!pool.length) continue;
    const t = pool[Math.floor(Math.random() * pool.length)];
    const tk = templateKeyFor(t);

    const exists = await Player.exists({ ownerId: bot._id, templateKey: tk });
    if (exists) continue;

    const player = await Player.create({
      name: t.name,
      rating: t.rating,
      stats: t.stats,
      rarity: t.rarity,
      nation: t.nation || null,
      clubName: t.clubName || null,
      ownerId: new mongoose.Types.ObjectId(String(bot._id)),
      templateKey: tk,
    });

    await MarketListing.create({
      playerId: player._id,
      sellerId: bot._id,
      type: "instant",
      status: "active",
      buyNowPrice: priceForTemplate(t),
    });
  }
}

module.exports = { seedMarketListings };


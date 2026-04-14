const mongoose = require("mongoose");

const marketPriceHistorySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, index: true },
    templateKey: { type: String, required: true, index: true },
    rarity: { type: String, required: true, enum: ["common", "rare", "epic", "legendary"], index: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    sumPrice: { type: Number, required: true, default: 0, min: 0 },
    minPrice: { type: Number, default: null, min: 0 },
    maxPrice: { type: Number, default: null, min: 0 },
    lastPrice: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

marketPriceHistorySchema.index({ day: 1, templateKey: 1 }, { unique: true });
marketPriceHistorySchema.index({ templateKey: 1, day: -1 });

const MarketPriceHistory = mongoose.model("MarketPriceHistory", marketPriceHistorySchema);

module.exports = { MarketPriceHistory };


const mongoose = require("mongoose");

const marketListingSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, enum: ["instant", "auction"], index: true },
    status: { type: String, required: true, enum: ["active", "sold", "expired", "cancelled"], default: "active", index: true },
    buyNowPrice: { type: Number, default: null, min: 1 },
    startingBid: { type: Number, default: null, min: 1 },
    currentBid: { type: Number, default: null, min: 1 },
    currentBidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    soldToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    soldPrice: { type: Number, default: null, min: 1 },
  },
  { timestamps: true }
);

marketListingSchema.index({ playerId: 1, status: 1 });
marketListingSchema.index({ status: 1, endsAt: 1 });

const MarketListing = mongoose.model("MarketListing", marketListingSchema);

module.exports = { MarketListing };


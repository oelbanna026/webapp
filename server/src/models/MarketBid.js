const mongoose = require("mongoose");

const marketBidSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketListing", required: true, index: true },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

marketBidSchema.index({ listingId: 1, createdAt: -1 });

const MarketBid = mongoose.model("MarketBid", marketBidSchema);

module.exports = { MarketBid };


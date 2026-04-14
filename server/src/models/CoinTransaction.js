const mongoose = require("mongoose");

const coinTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    idempotencyKey: { type: String, default: null },
    meta: { type: Object, default: null },
  },
  { timestamps: true }
);

coinTransactionSchema.index({ userId: 1, createdAt: -1 });
coinTransactionSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

const CoinTransaction = mongoose.model("CoinTransaction", coinTransactionSchema);

module.exports = { CoinTransaction };


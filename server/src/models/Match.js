const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, required: true, enum: ["in_progress", "completed"], default: "in_progress", index: true },
    seed: { type: Number, required: true },
    formation: { type: String, default: null },
    squadPlayerIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    coachBonus: { type: Number, default: 0 },
    chemistryScore: { type: Number, default: 0 },
    chemistryBonus: { type: Number, default: 0 },
    attack: { type: Number, default: 0 },
    midfield: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    teamPower: { type: Number, default: 0 },
    randomFactor: { type: Number, default: null },
    opponentPower: { type: Number, default: null },
    resultScore: { type: Number, default: null },
    outcome: { type: String, default: null, enum: [null, "win", "loss"] },
    rewardCoins: { type: Number, default: null },
    rewardXp: { type: Number, default: null },
    rewardPacks: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

matchSchema.index({ userId: 1, createdAt: -1 });

const Match = mongoose.model("Match", matchSchema);

module.exports = { Match };

const mongoose = require("mongoose");

const playerStatsSchema = new mongoose.Schema(
  {
    pace: { type: Number, required: true, min: 1, max: 99 },
    shooting: { type: Number, required: true, min: 1, max: 99 },
    passing: { type: Number, required: true, min: 1, max: 99 },
    defense: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 64 },
    rating: { type: Number, required: true, min: 1, max: 99 },
    stats: { type: playerStatsSchema, required: true },
    rarity: { type: String, required: true, enum: ["common", "rare", "epic", "legendary"] },
    position: { type: String, default: null, index: true },
    nation: { type: String, default: null, index: true },
    clubName: { type: String, default: null, index: true },
    assets: {
      portraitKey: { type: String, default: null },
      cardFrameKey: { type: String, default: null },
      kitKey: { type: String, default: null },
      logoKey: { type: String, default: null },
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    templateKey: { type: String, default: null, index: true },
    level: { type: Number, required: true, default: 1, min: 1, max: 50 },
    xp: { type: Number, required: true, default: 0, min: 0 },
    statPoints: { type: Number, required: true, default: 0, min: 0 },
    upgradeSpent: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

playerSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    name: this.name,
    rating: this.rating,
    stats: this.stats,
    rarity: this.rarity,
    position: this.position,
    nation: this.nation,
    clubName: this.clubName,
    assets: this.assets,
    ownerId: this.ownerId ? String(this.ownerId) : null,
    templateKey: this.templateKey,
    level: this.level,
    xp: this.xp,
    statPoints: this.statPoints,
    upgradeSpent: this.upgradeSpent,
  };
};

const Player = mongoose.model("Player", playerSchema);

module.exports = { Player };

const mongoose = require("mongoose");

const playerTemplateSchema = new mongoose.Schema(
  {
    templateKey: { type: String, required: true, unique: true, index: true },
    source: {
      provider: { type: String, required: true, default: "api-football" },
      leagueId: { type: Number, default: null },
      teamId: { type: Number, default: null },
      season: { type: Number, default: null },
      externalPlayerId: { type: Number, default: null, index: true },
    },

    name: { type: String, required: true, trim: true, maxlength: 64 },
    position: { type: String, default: null },
    nation: { type: String, default: null },
    clubName: { type: String, default: null },
    imageUrl: { type: String, default: null },

    rating: { type: Number, required: true, min: 1, max: 99 },
    rarity: { type: String, required: true, enum: ["common", "rare", "epic", "legendary"], index: true },
    stats: {
      pace: { type: Number, required: true, min: 0, max: 100 },
      shooting: { type: Number, required: true, min: 0, max: 100 },
      passing: { type: Number, required: true, min: 0, max: 100 },
      defense: { type: Number, required: true, min: 0, max: 100 },
    },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true }
);

const PlayerTemplate = mongoose.model("PlayerTemplate", playerTemplateSchema);

module.exports = { PlayerTemplate };


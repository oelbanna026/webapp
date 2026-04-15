const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
    nameLower: { type: String, required: true, unique: true, index: true },
    logo: {
      type: {
        type: String,
        required: true,
        enum: ["preset", "ai"],
        default: "preset",
      },
      presetId: { type: String, default: null },
      url: { type: String, default: null },
      meta: {
        style: { type: String, default: null },
        monogram: { type: String, default: null },
      },
    },
    kit: {
      primary: { type: String, required: true },
      secondary: { type: String, required: true },
    },
    coach: {
      type: { type: String, required: true, enum: ["attacking", "defensive", "balanced"], default: "balanced" },
      bonusAttack: { type: Number, required: true, default: 0 },
      bonusDefense: { type: Number, required: true, default: 0 },
      bonusAll: { type: Number, required: true, default: 0 },
    },
    theme: { type: String, required: true, enum: ["night", "neon", "classic"], default: "night" },
    stadium: {
      id: { type: String, required: true, default: "night-bowl" },
      name: { type: String, required: true, default: "Night Bowl" },
    },
    affiliation: {
      leagueKey: { type: String, default: "egypt" },
      teamName: { type: String, default: null },
      tier: { type: String, default: null },
      style: { type: String, default: null },
    },
  },
  { timestamps: true }
);

clubSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    name: this.name,
    logo: this.logo,
    kit: this.kit,
    coach: this.coach,
    theme: this.theme,
    stadium: this.stadium,
    affiliation: this.affiliation,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Club = mongoose.model("Club", clubSchema);

module.exports = { Club };

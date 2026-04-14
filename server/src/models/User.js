const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 32, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    coins: { type: Number, required: true, default: 0, min: 0 },
    starterPacks: { type: Number, required: true, default: 0, min: 0 },
    freePacks: { type: Number, required: true, default: 0, min: 0 },
    xp: { type: Number, required: true, default: 0, min: 0 },
    rankRating: { type: Number, required: true, default: 1000, min: 0, index: true },
    energy: { type: Number, required: true, default: 10, min: 0 },
    energyUpdatedAt: { type: Date, default: null },
    dailyStreak: { type: Number, required: true, default: 0, min: 0 },
    lastDailyClaimAt: { type: Date, default: null },
    missionDay: { type: String, default: null },
    winsToday: { type: Number, required: true, default: 0, min: 0 },
    packsOpenedToday: { type: Number, required: true, default: 0, min: 0 },
    missionClaimedWin3: { type: Boolean, required: true, default: false },
    missionClaimedOpen2: { type: Boolean, required: true, default: false },
    packsOpenedTotal: { type: Number, required: true, default: 0, min: 0 },
    matchesPlayedTotal: { type: Number, required: true, default: 0, min: 0 },
    winsTotal: { type: Number, required: true, default: 0, min: 0 },
    marketTradesTotal: { type: Number, required: true, default: 0, min: 0 },
    scoutingDay: { type: String, default: null },
    scoutingTokens: { type: Number, required: true, default: 0, min: 0 },
    scoutingTokensCap: { type: Number, required: true, default: 3, min: 0, max: 10 },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = async function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    username: this.username,
    email: this.email,
    coins: this.coins,
    starterPacks: this.starterPacks,
    freePacks: this.freePacks,
    xp: this.xp,
    rankRating: this.rankRating,
    energy: this.energy,
    energyUpdatedAt: this.energyUpdatedAt,
    dailyStreak: this.dailyStreak,
    lastDailyClaimAt: this.lastDailyClaimAt,
    missionDay: this.missionDay,
    winsToday: this.winsToday,
    packsOpenedToday: this.packsOpenedToday,
    missionClaimedWin3: this.missionClaimedWin3,
    missionClaimedOpen2: this.missionClaimedOpen2,
    packsOpenedTotal: this.packsOpenedTotal,
    matchesPlayedTotal: this.matchesPlayedTotal,
    winsTotal: this.winsTotal,
    marketTradesTotal: this.marketTradesTotal,
    scoutingDay: this.scoutingDay,
    scoutingTokens: this.scoutingTokens,
    scoutingTokensCap: this.scoutingTokensCap,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model("User", userSchema);

module.exports = { User };

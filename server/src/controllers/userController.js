const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { syncEnergy } = require("../services/energyService");

async function getMe(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const user = await User.findById(userId);
    if (!user) throw createHttpError(404, "User not found");

    const changed = syncEnergy(user);
    if (changed) await user.save();

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function setCoins(req, res, next) {
  try {
    throw createHttpError(403, "Direct coin updates are disabled");
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, setCoins };

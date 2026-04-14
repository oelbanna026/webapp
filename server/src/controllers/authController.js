const bcrypt = require("bcryptjs");
const { User } = require("../models/User");
const { Player } = require("../models/Player");
const { createHttpError } = require("../utils/createHttpError");
const { signAccessToken } = require("../utils/jwt");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

async function signup(req, res, next) {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (username.length < 3) throw createHttpError(400, "Username must be at least 3 characters");
    if (!email.includes("@")) throw createHttpError(400, "Invalid email");
    if (password.length < 8) throw createHttpError(400, "Password must be at least 8 characters");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash, coins: 1000 });
    const starters = await Player.find({ ownerId: null }).sort({ rating: -1 }).limit(12).select({ _id: 1 });
    if (starters.length > 0) {
      await Player.updateMany({ _id: { $in: starters.map((p) => p._id) } }, { $set: { ownerId: user._id } });
    }
    const token = signAccessToken(user);

    res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    if (err && err.code === 11000) {
      return next(createHttpError(409, "Username or email already in use", err.keyValue));
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) throw createHttpError(400, "Email and password are required");

    const user = await User.findOne({ email });
    if (!user) throw createHttpError(401, "Invalid credentials");

    const ok = await user.verifyPassword(password);
    if (!ok) throw createHttpError(401, "Invalid credentials");

    const token = signAccessToken(user);
    res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    return next(err);
  }
}

module.exports = { signup, login };

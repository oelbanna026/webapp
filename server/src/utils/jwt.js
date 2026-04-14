const jwt = require("jsonwebtoken");
const { getEnv } = require("../config/env");

function signAccessToken(user) {
  const env = getEnv();
  return jwt.sign({ username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    subject: String(user._id),
  });
}

module.exports = { signAccessToken };

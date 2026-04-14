const jwt = require("jsonwebtoken");
const { getEnv } = require("../config/env");
const { createHttpError } = require("../utils/createHttpError");

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return next(createHttpError(401, "Missing bearer token"));

  try {
    const env = getEnv();
    const payload = jwt.verify(token, env.jwtSecret);
    req.auth = { userId: payload.sub };
    return next();
  } catch (_err) {
    return next(createHttpError(401, "Invalid token"));
  }
}

module.exports = { requireAuth };

const { createHttpError } = require("../utils/createHttpError");

function requireAdminSecret(req, _res, next) {
  const secret = process.env.IMPORT_ADMIN_SECRET || "";
  const env = process.env.NODE_ENV || "development";
  if (!secret && env !== "production") return next();
  if (!secret) return next(createHttpError(403, "Admin access is disabled"));

  const provided = req.headers["x-admin-secret"];
  if (!provided || String(provided) !== String(secret)) return next(createHttpError(403, "Forbidden"));
  return next();
}

module.exports = { requireAdminSecret };


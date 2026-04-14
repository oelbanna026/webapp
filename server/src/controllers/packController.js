const { createHttpError } = require("../utils/createHttpError");
const { openPack } = require("../services/packService");

async function openPackHandler(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const packType = req.body?.packType ? String(req.body.packType) : "standard";
    const result = await openPack({ userId, packType });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { openPackHandler };

const { createHttpError } = require("../utils/createHttpError");
const { getCurrentEvent } = require("../services/eventService");

async function getCurrent(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    res.json({ event: getCurrentEvent() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCurrent };


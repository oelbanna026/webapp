const { Player } = require("../models/Player");
const { createHttpError } = require("../utils/createHttpError");
const { ensureIdentityForPlayers } = require("../utils/playerIdentity");

async function listPlayers(req, res, next) {
  try {
    const scope = String(req.query.scope || "all");
    const query = {};
    if (scope === "mine") {
      const userId = req.auth?.userId;
      if (!userId) throw createHttpError(401, "Unauthorized");
      query.ownerId = userId;
    }
    let players = await Player.find(query).sort({ rating: -1, rarity: -1, name: 1 });
    if (scope === "mine" && players.length === 0) {
      const starters = await Player.find({ ownerId: null }).sort({ rating: -1 }).limit(12).select({ _id: 1 });
      if (starters.length > 0) {
        await Player.updateMany({ _id: { $in: starters.map((p) => p._id) } }, { $set: { ownerId: query.ownerId } });
        players = await Player.find(query).sort({ rating: -1, rarity: -1, name: 1 });
      }
    }
    await ensureIdentityForPlayers(Player, players);
    res.json({ players: players.map((p) => p.toPublicJSON()) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlayers };

const mongoose = require("mongoose");
const { MarketListing } = require("../models/MarketListing");
const { Player } = require("../models/Player");
const { createHttpError } = require("../utils/createHttpError");
const { listingDTO } = require("../utils/marketDto");
const { marketBus } = require("../realtime/marketBus");
const { buyNow, cancelListing, createListing, getPriceSuggestion, placeBid } = require("../services/marketService");
const { getHistory } = require("../services/marketHistoryService");
const { ensureIdentityForPlayers } = require("../utils/playerIdentity");

function parseFilters(query) {
  const status = String(query.status || "active");
  const rarity = query.rarity ? String(query.rarity) : null;
  const type = query.type ? String(query.type) : null;
  const minRating = query.minRating ? Number(query.minRating) : null;
  const maxRating = query.maxRating ? Number(query.maxRating) : null;
  const minPrice = query.minPrice ? Number(query.minPrice) : null;
  const maxPrice = query.maxPrice ? Number(query.maxPrice) : null;

  return { status, rarity, type, minRating, maxRating, minPrice, maxPrice };
}

async function listListings(req, res, next) {
  try {
    const { status, rarity, type, minRating, maxRating, minPrice, maxPrice } = parseFilters(req.query);

    const match = {};
    if (status) match.status = status;
    if (type) match.type = type;

    if (minPrice !== null || maxPrice !== null) {
      const cond = [];
      if (minPrice !== null) cond.push({ $gte: ["$effectivePrice", minPrice] });
      if (maxPrice !== null) cond.push({ $lte: ["$effectivePrice", maxPrice] });
      match.$expr = cond.length === 1 ? cond[0] : { $and: cond };
    }

    const pipeline = [
      {
        $addFields: {
          effectivePrice: {
            $cond: [{ $eq: ["$type", "instant"] }, "$buyNowPrice", { $ifNull: ["$currentBid", "$startingBid"] }],
          },
        },
      },
      { $match: match },
      {
        $lookup: {
          from: "players",
          localField: "playerId",
          foreignField: "_id",
          as: "player",
        },
      },
      { $unwind: "$player" },
    ];

    const playerMatch = {};
    if (rarity) playerMatch["player.rarity"] = rarity;
    if (minRating !== null) playerMatch["player.rating"] = { ...(playerMatch["player.rating"] || {}), $gte: minRating };
    if (maxRating !== null) playerMatch["player.rating"] = { ...(playerMatch["player.rating"] || {}), $lte: maxRating };
    if (Object.keys(playerMatch).length > 0) pipeline.push({ $match: playerMatch });

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $limit: 200 });

    const rows = await MarketListing.aggregate(pipeline);
    await ensureIdentityForPlayers(Player, rows.map((r) => r.player));
    const listings = rows.map((r) => ({
      id: String(r._id),
      type: r.type,
      status: r.status,
      buyNowPrice: r.buyNowPrice ?? null,
      startingBid: r.startingBid ?? null,
      currentBid: r.currentBid ?? null,
      currentBidderId: r.currentBidderId ? String(r.currentBidderId) : null,
      endsAt: r.endsAt ? new Date(r.endsAt).toISOString() : null,
      soldToUserId: r.soldToUserId ? String(r.soldToUserId) : null,
      soldPrice: r.soldPrice ?? null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      player: {
        id: String(r.player._id),
        name: r.player.name,
        rating: r.player.rating,
        stats: r.player.stats,
        rarity: r.player.rarity,
        nation: r.player.nation ?? null,
        clubName: r.player.clubName ?? null,
        ownerId: r.player.ownerId ? String(r.player.ownerId) : null,
      },
    }));

    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

async function createListingHandler(req, res, next) {
  try {
    const sellerId = req.auth?.userId;
    if (!sellerId) throw createHttpError(401, "Unauthorized");

    const listing = await createListing({
      sellerId,
      playerId: req.body.playerId,
      type: req.body.type,
      buyNowPrice: req.body.buyNowPrice,
      startingBid: req.body.startingBid,
      durationSeconds: req.body.durationSeconds,
    });

    const payload = listingDTO(listing);
    marketBus.emit("market.upsert", payload);

    res.status(201).json({ listing: payload });
  } catch (err) {
    next(err);
  }
}

async function buyNowHandler(req, res, next) {
  try {
    const buyerId = req.auth?.userId;
    if (!buyerId) throw createHttpError(401, "Unauthorized");

    const listing = await buyNow({ buyerId, listingId: req.body.listingId });
    const payload = listingDTO(listing);
    marketBus.emit("market.upsert", payload);

    res.json({ listing: payload });
  } catch (err) {
    next(err);
  }
}

async function bidHandler(req, res, next) {
  try {
    const bidderId = req.auth?.userId;
    if (!bidderId) throw createHttpError(401, "Unauthorized");

    const { listing, bid } = await placeBid({ bidderId, listingId: req.body.listingId, amount: req.body.amount });
    const payload = listingDTO(listing);
    marketBus.emit("market.upsert", payload);

    res.json({ listing: payload, bid: { id: String(bid._id), amount: bid.amount, createdAt: bid.createdAt.toISOString() } });
  } catch (err) {
    next(err);
  }
}

async function cancelHandler(req, res, next) {
  try {
    const sellerId = req.auth?.userId;
    if (!sellerId) throw createHttpError(401, "Unauthorized");

    const listingId = req.params.id;
    if (!mongoose.isValidObjectId(listingId)) throw createHttpError(400, "Invalid listing id");

    const listing = await cancelListing({ sellerId, listingId });
    const payload = listingDTO(listing);
    marketBus.emit("market.upsert", payload);

    res.json({ listing: payload });
  } catch (err) {
    next(err);
  }
}

async function priceSuggestionHandler(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");
    const playerId = req.query.playerId;
    const out = await getPriceSuggestion({ userId, playerId });
    res.json(out);
  } catch (err) {
    next(err);
  }
}

async function priceHistoryHandler(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) throw createHttpError(401, "Unauthorized");

    const days = req.query.days ? Number(req.query.days) : 7;
    const playerId = req.query.playerId ? String(req.query.playerId) : null;
    const templateKey = req.query.templateKey ? String(req.query.templateKey) : null;

    let key = templateKey;
    if (!key && playerId) {
      if (!mongoose.isValidObjectId(playerId)) throw createHttpError(400, "Invalid playerId");
      const player = await Player.findById(playerId);
      if (!player) throw createHttpError(404, "Player not found");
      if (!player.ownerId || String(player.ownerId) !== String(userId)) throw createHttpError(403, "You do not own this player");
      key = player.templateKey;
    }
    if (!key) throw createHttpError(400, "templateKey or playerId is required");

    const history = await getHistory({ templateKey: key, days });
    res.json({ templateKey: key, history });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listListings,
  createListingHandler,
  buyNowHandler,
  bidHandler,
  cancelHandler,
  priceSuggestionHandler,
  priceHistoryHandler,
};

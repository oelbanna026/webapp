const mongoose = require("mongoose");
const { MarketBid } = require("../models/MarketBid");
const { MarketListing } = require("../models/MarketListing");
const { Player } = require("../models/Player");
const { User } = require("../models/User");
const { createHttpError } = require("../utils/createHttpError");
const { runWithOptionalTransaction } = require("../utils/runWithOptionalTransaction");
const { creditCoins, debitCoins } = require("./coinService");
const { getCurrentEvent } = require("./eventService");
const { recordSale } = require("./marketHistoryService");

const MIN_BID_INCREMENT = 50;

function clampInt(value, { min, max }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min) return null;
  if (i > max) return null;
  return i;
}

function computeMarketFee(price) {
  const event = getCurrentEvent();
  const pct = Number(event?.marketFeePercent || 0);
  if (!Number.isFinite(pct) || pct <= 0) return { fee: 0, net: price, percent: 0, event };
  const fee = Math.max(0, Math.floor((price * pct) / 100));
  const net = Math.max(0, price - fee);
  return { fee, net, percent: pct, event };
}

function suggestPricesForPlayer(player) {
  const rating = Number(player?.rating) || 0;
  const level = Number(player?.level) || 1;
  const rarity = String(player?.rarity || "common");
  const upgradeSpent = Number(player?.upgradeSpent) || 0;

  const rarityMult = rarity === "legendary" ? 4.0 : rarity === "epic" ? 2.2 : rarity === "rare" ? 1.3 : 0.9;
  const levelMult = 1 + Math.min(0.7, Math.max(0, (level - 1) * 0.02));
  const upgradeMult = 1 + Math.min(0.6, Math.max(0, upgradeSpent * 0.01));

  const event = getCurrentEvent();
  const idxMult = Number(event?.marketIndexMultiplier || 1);
  const marketMult = Number.isFinite(idxMult) && idxMult > 0 ? idxMult : 1;

  const base = Math.max(300, Math.round((rating ** 2) * 1.8 * rarityMult * levelMult * upgradeMult * marketMult));
  const suggestedBuyNow = Math.max(1, Math.round(base / 50) * 50);
  const suggestedStartingBid = Math.max(1, Math.round((suggestedBuyNow * 0.8) / 50) * 50);

  const { percent: feePercent } = computeMarketFee(suggestedBuyNow);

  return {
    suggestedBuyNow,
    suggestedStartingBid,
    marketIndexMultiplier: marketMult,
    marketFeePercent: feePercent,
    event: event ? { id: event.id, name: event.name } : null,
  };
}

async function getPriceSuggestion({ userId, playerId }) {
  if (!mongoose.isValidObjectId(playerId)) throw createHttpError(400, "Invalid playerId");
  const player = await Player.findById(playerId);
  if (!player) throw createHttpError(404, "Player not found");
  if (!player.ownerId || String(player.ownerId) !== String(userId)) throw createHttpError(403, "You do not own this player");
  return { playerId: String(player._id), ...suggestPricesForPlayer(player) };
}

async function createListing({ sellerId, playerId, type, buyNowPrice, startingBid, durationSeconds }) {
  return runWithOptionalTransaction(async (session) => {
    const withSession = (q) => (session ? q.session(session) : q);

    if (!mongoose.isValidObjectId(playerId)) throw createHttpError(400, "Invalid playerId");
    if (type !== "instant" && type !== "auction") throw createHttpError(400, "Invalid listing type");

    const player = await withSession(Player.findById(playerId));
    if (!player) throw createHttpError(404, "Player not found");
    if (!player.ownerId || String(player.ownerId) !== String(sellerId)) throw createHttpError(403, "You do not own this player");

    const existing = await withSession(MarketListing.findOne({ playerId, status: "active" }));
    if (existing) throw createHttpError(409, "Player is already listed");

    const listing = new MarketListing({ sellerId, playerId, type, status: "active" });

    if (type === "instant") {
      const p = clampInt(buyNowPrice, { min: 1, max: 10_000_000 });
      if (!p) throw createHttpError(400, "Invalid buyNowPrice");
      listing.buyNowPrice = p;
    } else {
      const sb = clampInt(startingBid, { min: 1, max: 10_000_000 });
      if (!sb) throw createHttpError(400, "Invalid startingBid");
      const dur = clampInt(durationSeconds, { min: 30, max: 3600 });
      if (!dur) throw createHttpError(400, "Invalid durationSeconds");
      listing.startingBid = sb;
      listing.endsAt = new Date(Date.now() + dur * 1000);
      if (buyNowPrice !== undefined && buyNowPrice !== null && String(buyNowPrice) !== "") {
        const p = clampInt(buyNowPrice, { min: 1, max: 10_000_000 });
        if (!p) throw createHttpError(400, "Invalid buyNowPrice");
        listing.buyNowPrice = p;
      }
    }

    if (session) await listing.save({ session });
    else await listing.save();
    await listing.populate(["playerId", "sellerId"]);
    return listing;
  });
}

async function buyNow({ buyerId, listingId }) {
  return runWithOptionalTransaction(async (session) => {
    const withSession = (q) => (session ? q.session(session) : q);

    if (!mongoose.isValidObjectId(listingId)) throw createHttpError(400, "Invalid listingId");

    const listing = await withSession(MarketListing.findById(listingId));
    if (!listing) throw createHttpError(404, "Listing not found");
    if (listing.status !== "active") throw createHttpError(409, "Listing is not active");
    if (String(listing.sellerId) === String(buyerId)) throw createHttpError(403, "Cannot buy your own listing");

    const now = Date.now();
    if (listing.type === "auction" && listing.endsAt && listing.endsAt.getTime() <= now) throw createHttpError(409, "Auction ended");

    const price = clampInt(listing.buyNowPrice, { min: 1, max: 10_000_000 });
    if (!price) throw createHttpError(409, "Listing has no buy now price");

    const player = await withSession(Player.findById(listing.playerId));
    if (!player) throw createHttpError(404, "Player not found");
    if (!player.ownerId || String(player.ownerId) !== String(listing.sellerId)) throw createHttpError(409, "Seller no longer owns this player");

    const { net } = computeMarketFee(price);
    await debitCoins({ userId: buyerId, amount: price, type: "MARKET_BUY", meta: { listingId: String(listing._id) } }, session);
    await creditCoins({ userId: listing.sellerId, amount: net, type: "MARKET_SELL", meta: { listingId: String(listing._id) } }, session);

    if (listing.type === "auction" && listing.currentBidderId && listing.currentBid) {
      await creditCoins(
        {
          userId: listing.currentBidderId,
          amount: listing.currentBid,
          type: "AUCTION_REFUND",
          meta: { listingId: String(listing._id) },
        },
        session
      );
      listing.currentBid = null;
      listing.currentBidderId = null;
    }

    player.ownerId = new mongoose.Types.ObjectId(String(buyerId));
    listing.status = "sold";
    listing.soldToUserId = new mongoose.Types.ObjectId(String(buyerId));
    listing.soldPrice = price;

    if (session) await Promise.all([player.save({ session }), listing.save({ session })]);
    else await Promise.all([player.save(), listing.save()]);

    const seller = await withSession(User.findById(listing.sellerId));
    const buyer = await withSession(User.findById(buyerId));
    if (seller) {
      seller.marketTradesTotal = (seller.marketTradesTotal || 0) + 1;
      if (session) await seller.save({ session });
      else await seller.save();
    }
    if (buyer) {
      buyer.marketTradesTotal = (buyer.marketTradesTotal || 0) + 1;
      if (session) await buyer.save({ session });
      else await buyer.save();
    }

    await recordSale({ templateKey: player.templateKey, rarity: player.rarity, price }, session);

    await listing.populate(["playerId", "sellerId", "soldToUserId"]);
    return listing;
  });
}

async function placeBid({ bidderId, listingId, amount }) {
  return runWithOptionalTransaction(async (session) => {
    const withSession = (q) => (session ? q.session(session) : q);

    if (!mongoose.isValidObjectId(listingId)) throw createHttpError(400, "Invalid listingId");
    const bidAmount = clampInt(amount, { min: 1, max: 10_000_000 });
    if (!bidAmount) throw createHttpError(400, "Invalid bid amount");

    const listing = await withSession(MarketListing.findById(listingId));
    if (!listing) throw createHttpError(404, "Listing not found");
    if (listing.status !== "active") throw createHttpError(409, "Listing is not active");
    if (listing.type !== "auction") throw createHttpError(409, "Listing is not an auction");
    if (String(listing.sellerId) === String(bidderId)) throw createHttpError(403, "Cannot bid on your own listing");
    if (!listing.endsAt || listing.endsAt.getTime() <= Date.now()) throw createHttpError(409, "Auction ended");

    const minBid = listing.currentBid ? listing.currentBid + MIN_BID_INCREMENT : listing.startingBid;
    if (!minBid) throw createHttpError(409, "Invalid auction configuration");
    if (bidAmount < minBid) throw createHttpError(409, `Minimum bid is ${minBid}`);

    const prevBidderId = listing.currentBidderId ? String(listing.currentBidderId) : null;
    const prevBid = listing.currentBid || 0;

    if (prevBidderId && prevBidderId === String(bidderId)) {
      const delta = bidAmount - prevBid;
      if (delta <= 0) throw createHttpError(409, "Bid must increase");
      await debitCoins({ userId: bidderId, amount: delta, type: "AUCTION_BID_TOPUP", meta: { listingId } }, session);
    } else {
      await debitCoins({ userId: bidderId, amount: bidAmount, type: "AUCTION_BID_ESCROW", meta: { listingId } }, session);
      if (prevBidderId && prevBid > 0) {
        await creditCoins({ userId: prevBidderId, amount: prevBid, type: "AUCTION_REFUND", meta: { listingId } }, session);
      }
    }

    listing.currentBid = bidAmount;
    listing.currentBidderId = new mongoose.Types.ObjectId(String(bidderId));

    const bidDocs = await MarketBid.create(
      [{ listingId: listing._id, bidderId: new mongoose.Types.ObjectId(String(bidderId)), amount: bidAmount }],
      session ? { session } : undefined
    );

    if (session) await listing.save({ session });
    else await listing.save();

    await listing.populate(["playerId", "sellerId", "currentBidderId"]);
    return { listing, bid: bidDocs[0] };
  });
}

async function cancelListing({ sellerId, listingId }) {
  return runWithOptionalTransaction(async (session) => {
    const withSession = (q) => (session ? q.session(session) : q);

    if (!mongoose.isValidObjectId(listingId)) throw createHttpError(400, "Invalid listingId");
    const listing = await withSession(MarketListing.findById(listingId));
    if (!listing) throw createHttpError(404, "Listing not found");
    if (listing.status !== "active") throw createHttpError(409, "Listing is not active");
    if (String(listing.sellerId) !== String(sellerId)) throw createHttpError(403, "Not your listing");

    if (listing.type === "auction" && listing.currentBidderId && listing.currentBid) {
      await creditCoins(
        { userId: listing.currentBidderId, amount: listing.currentBid, type: "AUCTION_REFUND", meta: { listingId } },
        session
      );
      listing.currentBid = null;
      listing.currentBidderId = null;
    }

    listing.status = "cancelled";
    if (session) await listing.save({ session });
    else await listing.save();
    await listing.populate(["playerId", "sellerId"]);
    return listing;
  });
}

async function finalizeExpiredAuctions({ limit = 25 } = {}) {
  const now = new Date();
  const finalized = [];

  for (let i = 0; i < limit; i += 1) {
    const picked = await MarketListing.findOneAndUpdate(
      { status: "active", type: "auction", endsAt: { $lte: now } },
      { $set: { status: "expired" } },
      { sort: { endsAt: 1 }, new: true }
    );
    if (!picked) break;

    const result = await runWithOptionalTransaction(async (session) => {
      const withSession = (q) => (session ? q.session(session) : q);
      const listing = await withSession(MarketListing.findById(picked._id));
      if (!listing) return null;

      if (listing.currentBidderId && listing.currentBid) {
        const player = await withSession(Player.findById(listing.playerId));
        if (!player) throw createHttpError(409, "Finalize failed");
        if (!player.ownerId || String(player.ownerId) !== String(listing.sellerId)) throw createHttpError(409, "Seller no longer owns this player");

        const { net } = computeMarketFee(listing.currentBid);
        await creditCoins(
          { userId: listing.sellerId, amount: net, type: "AUCTION_SELL", meta: { listingId: String(listing._id) } },
          session
        );

        player.ownerId = listing.currentBidderId;
        listing.status = "sold";
        listing.soldToUserId = listing.currentBidderId;
        listing.soldPrice = listing.currentBid;

        if (session) await Promise.all([player.save({ session }), listing.save({ session })]);
        else await Promise.all([player.save(), listing.save()]);

        const seller = await withSession(User.findById(listing.sellerId));
        const buyer = await withSession(User.findById(listing.currentBidderId));
        if (seller) {
          seller.marketTradesTotal = (seller.marketTradesTotal || 0) + 1;
          if (session) await seller.save({ session });
          else await seller.save();
        }
        if (buyer) {
          buyer.marketTradesTotal = (buyer.marketTradesTotal || 0) + 1;
          if (session) await buyer.save({ session });
          else await buyer.save();
        }

        await recordSale({ templateKey: player.templateKey, rarity: player.rarity, price: listing.currentBid }, session);
      }

      await listing.populate(["playerId", "sellerId", "soldToUserId", "currentBidderId"]);
      return listing;
    });

    if (result) finalized.push(result);
  }

  return finalized;
}

module.exports = {
  MIN_BID_INCREMENT,
  getPriceSuggestion,
  createListing,
  buyNow,
  placeBid,
  cancelListing,
  finalizeExpiredAuctions,
};

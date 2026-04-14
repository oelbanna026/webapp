function listingDTO(listing) {
  if (!listing) return null;
  const player = listing.playerId && typeof listing.playerId === "object" ? listing.playerId : null;
  const seller = listing.sellerId && typeof listing.sellerId === "object" ? listing.sellerId : null;
  const currentBidder =
    listing.currentBidderId && typeof listing.currentBidderId === "object" ? listing.currentBidderId : null;

  return {
    id: String(listing._id),
    type: listing.type,
    status: listing.status,
    buyNowPrice: listing.buyNowPrice ?? null,
    startingBid: listing.startingBid ?? null,
    currentBid: listing.currentBid ?? null,
    currentBidderId: listing.currentBidderId ? String(listing.currentBidderId) : null,
    endsAt: listing.endsAt ? listing.endsAt.toISOString() : null,
    soldToUserId: listing.soldToUserId ? String(listing.soldToUserId) : null,
    soldPrice: listing.soldPrice ?? null,
    createdAt: listing.createdAt?.toISOString?.() || null,
    updatedAt: listing.updatedAt?.toISOString?.() || null,
    player: player?.toPublicJSON ? player.toPublicJSON() : null,
    seller: seller?.toPublicJSON ? seller.toPublicJSON() : null,
    currentBidder: currentBidder?.toPublicJSON ? currentBidder.toPublicJSON() : null,
  };
}

module.exports = { listingDTO };


const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const {
  bidHandler,
  buyNowHandler,
  cancelHandler,
  createListingHandler,
  listListings,
  priceSuggestionHandler,
  priceHistoryHandler,
} = require("../controllers/marketController");

const marketRouter = express.Router();

marketRouter.get("/listings", requireAuth, listListings);
marketRouter.get("/price-suggestion", requireAuth, priceSuggestionHandler);
marketRouter.get("/price-history", requireAuth, priceHistoryHandler);
marketRouter.post("/listings", requireAuth, createListingHandler);
marketRouter.post("/buy", requireAuth, buyNowHandler);
marketRouter.post("/bid", requireAuth, bidHandler);
marketRouter.delete("/listings/:id", requireAuth, cancelHandler);

module.exports = { marketRouter };

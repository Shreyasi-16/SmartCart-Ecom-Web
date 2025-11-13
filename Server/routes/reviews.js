// routes/reviews.js
const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");

const router = express.Router();

/* ------------------------------------------------------------------ */
/* Utils                                                              */
/* ------------------------------------------------------------------ */
function orSellerFilter(sellerId) {
  // Keep string id compatibility; also match if someone saved as ObjectId
  const conds = [{ sellerId }];
  if (mongoose.Types.ObjectId.isValid(sellerId)) {
    conds.push({ sellerId: new mongoose.Types.ObjectId(sellerId) });
  }
  return { $or: conds };
}

function normalizeReview(doc) {
  return {
    _id: doc._id,
    sellerId: doc.sellerId,
    buyerId: doc.buyerId,
    productId: doc.productId,
    orderId: doc.orderId,
    rating: doc.rating,
    title: doc.title || "Untitled review",
    publicName: doc.publicName || "Anonymous",
    comment: doc.comment || "",
    productQuality: doc.productQuality,
    deliveryRating: doc.deliveryRating,
    sellerComm: doc.sellerComm,
    verifiedPurchase: !!doc.verifiedPurchase,
    createdAt: doc.createdAt,
    // keep your analytics flags
    wasDelayed: doc.wasDelayed,
    refundRequested: doc.refundRequested,
    refundApproved: doc.refundApproved,
    disputeRaised: doc.disputeRaised,
    sentimentScore: doc.sentimentScore ?? null,
    fraudFlags: doc.fraudFlags ?? {},
  };
}

/* ------------------------------------------------------------------ */
/* CREATE                                                             */
/* ------------------------------------------------------------------ */
// POST /api/reviews
router.post("/", async (req, res) => {
  try {
    const {
      sellerId,
      buyerId,
      productId,
      orderId,
      rating,
      comment,
      title,
      publicName,
      productQuality,
      deliveryRating,
      sellerComm,
      verifiedPurchase,
      deliveryTimeDays,
      wasDelayed,
      refundRequested,
      refundApproved,
      disputeRaised,
    } = req.body;

    if (!sellerId || !buyerId || !productId || !orderId) {
      return res
        .status(400)
        .json({ error: "sellerId, buyerId, productId, orderId are required" });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be 1..5" });
    }
    if (!publicName || !publicName.trim()) {
      return res.status(400).json({ error: "publicName is required" });
    }

    const review = new Review({
      sellerId,
      buyerId,
      productId,
      orderId,
      rating,
      title: (title || "Untitled review").trim(),
      publicName: publicName.trim(),
      comment: (comment || "").trim(),
      productQuality: productQuality ?? null,
      deliveryRating: deliveryRating ?? null,
      sellerComm: sellerComm ?? null,
      verifiedPurchase: !!verifiedPurchase,
      deliveryTimeDays,
      wasDelayed: !!wasDelayed,
      refundRequested: !!refundRequested,
      refundApproved: !!refundApproved,
      disputeRaised: !!disputeRaised,
    });

    const saved = await review.save();
    return res.status(201).json(normalizeReview(saved));
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.orderId) {
      // unique(orderId) → only one review per order
      return res.status(409).json({ error: "Review already exists for this orderId" });
    }
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/* LIST (new unified endpoint)                                        */
/* ------------------------------------------------------------------ */
// GET /api/reviews?seller=<sellerId>[&product=<productId>]
router.get("/", async (req, res) => {
  try {
    const { seller, product } = req.query;
    if (!seller) {
      return res.status(400).json({ error: "seller query param is required" });
    }

    const query = { ...orSellerFilter(seller) };
    if (product) query.productId = product;

    const rows = await Review.find(query).sort({ createdAt: -1 }).lean();
    return res.json({
      count: rows.length,
      reviews: rows.map(normalizeReview),
    });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/* (Legacy) List by seller param path with optional product filter    */
/* ------------------------------------------------------------------ */
// GET /api/reviews/seller/:sellerId[?productId=...]
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { productId } = req.query;
    const limit = Number(req.query.limit || 100);
    const skip = Number(req.query.skip || 0);

    const filter = { sellerId };
    if (productId) filter.productId = productId;

    const rows = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ count: rows.length, reviews: rows.map(normalizeReview) });
  } catch (err) {
    console.error("Error fetching seller reviews:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/* Seller-wide stats for histogram/averages (Amazon-style)            */
/* ------------------------------------------------------------------ */
// GET /api/reviews/seller/:sellerId/stats[?productId=...]
router.get("/seller/:sellerId/stats", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { productId } = req.query;

    const match = { sellerId };
    if (productId) match.productId = productId;

    const [agg] = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
          avgPQ: { $avg: "$productQuality" },
          avgDel: { $avg: "$deliveryRating" },
          avgComm: { $avg: "$sellerComm" },
        },
      },
    ]);

    // Build histogram 1..5
    const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    const ratings = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$rating",
          c: { $sum: 1 },
        },
      },
    ]);
    ratings.forEach(r => {
      buckets[r._id] = r.c;
      total += r.c;
    });

    // overall average
    const avgAgg = await Review.aggregate([
      { $match: match },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const overall = avgAgg[0] || { avg: null, count: 0 };

    // aspect averages
    const aspectAgg = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          productQuality: { $avg: "$productQuality" },
          deliveryRating: { $avg: "$deliveryRating" },
          sellerComm: { $avg: "$sellerComm" },
        },
      },
    ]);
    const aspects =
      aspectAgg[0] || { productQuality: null, deliveryRating: null, sellerComm: null };

    res.json({
      total: overall.count,
      average: overall.avg,
      histogram: buckets, // {1: x, 2: y, 3: z, 4: a, 5: b}
      aspects,
    });
  } catch (err) {
    console.error("Error fetching review stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

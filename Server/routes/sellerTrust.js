// Server/routes/sellerTrust.js
const express = require("express");
const Review = require("../models/Review");

const router = express.Router();

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function scoreToStars(score) {
  if (score == null) return null;
  if (score >= 90) return 5.0;
  if (score >= 80) return 4.5;
  if (score >= 70) return 4.0;
  if (score >= 60) return 3.5;
  if (score >= 50) return 3.0;
  if (score >= 40) return 2.5;
  if (score >= 30) return 2.0;
  if (score >= 20) return 1.5;
  return 1.0;
}

function classifyRisk(trustScore, stats) {
  if (trustScore == null) return { riskLevel: "UNKNOWN", reasons: [] };

  let riskLevel = "MEDIUM";
  if (trustScore >= 70) riskLevel = "LOW";
  else if (trustScore < 40) riskLevel = "HIGH";

  const reasons = [];

  if (stats.fraudReviewRate > 0.2) {
    reasons.push("High percentage of reviews mention fraud/scam.");
  }
  if (stats.nonDeliveryRate > 0.15) {
    reasons.push("Frequent mentions of non-delivery.");
  }
  if (stats.disputeRate > 0.1) {
    reasons.push("High dispute rate.");
  }
  if (stats.lateDeliveryRate > 0.25) {
    reasons.push("Many orders were delivered late.");
  }
  if (stats.avgRating != null && stats.avgRating < 3) {
    reasons.push("Average rating below 3 stars.");
  }

  return { riskLevel, reasons };
}

// 🔹 NEW: build human-readable summary text + bullets
function buildSummary(trustScore, riskLevel, stats) {
  const {
    totalReviews,
    avgRating,
    fraudReviewRate,
    nonDeliveryRate,
    fakeProductRate,
    refundRequestedRate,
    refundApprovedRate,
    disputeRate,
    lateDeliveryRate,
  } = stats;

  const toPct = (x) => Math.round((x || 0) * 100);

  const latePct = toPct(lateDeliveryRate);
  const refundPct = toPct(refundApprovedRate);
  const disputePct = toPct(disputeRate);
  const fraudPct = toPct(fraudReviewRate);
  const nonDeliveryPct = toPct(nonDeliveryRate);
  const fakeProductPct = toPct(fakeProductRate);

  // Main one-liner
  let main;
  if (!totalReviews) {
    main = "This seller has no reviews yet.";
  } else if (avgRating != null) {
    main = `This seller has ${totalReviews} review${
      totalReviews > 1 ? "s" : ""
    } with an average rating of ${avgRating.toFixed(
      1
    )} out of 5 and a trust score of ${trustScore}/100 (${riskLevel} risk).`;
  } else {
    main = `This seller has ${totalReviews} review${
      totalReviews > 1 ? "s" : ""
    } and a trust score of ${trustScore}/100 (${riskLevel} risk).`;
  }

  const bullets = [];

  // Delivery
  if (latePct === 0) {
    bullets.push("Buyers rarely report delayed delivery.");
  } else if (latePct <= 20) {
    bullets.push(`${latePct}% of buyers reported delayed delivery.`);
  } else {
    bullets.push(
      `${latePct}% of buyers reported delayed delivery, which is relatively high.`
    );
  }

  // Refunds
  if (refundPct === 0) {
    bullets.push("Very few orders result in approved refunds.");
  } else if (refundPct <= 15) {
    bullets.push(
      `${refundPct}% of orders resulted in approved refunds, which is within a normal range.`
    );
  } else {
    bullets.push(
      `${refundPct}% of orders resulted in approved refunds, which may indicate quality or fulfilment issues.`
    );
  }

  // Disputes
  if (disputePct === 0) {
    bullets.push("Formal disputes from buyers are rare.");
  } else {
    bullets.push(
      `${disputePct}% of transactions involved disputes raised by buyers.`
    );
  }

  // Fraud / non-delivery / fake product signals
  if (fraudPct > 0) {
    bullets.push(
      `${fraudPct}% of reviews mention possible fraud or scam-like behaviour.`
    );
  }
  if (nonDeliveryPct > 0) {
    bullets.push(`${nonDeliveryPct}% of reviews mention non-delivery issues.`);
  }
  if (fakeProductPct > 0) {
    bullets.push(
      `${fakeProductPct}% of reviews mention fake or not-as-described products.`
    );
  }

  // Overall risk line
  if (riskLevel === "LOW") {
    bullets.push(
      "Overall, this seller appears to be low risk based on buyer history."
    );
  } else if (riskLevel === "MEDIUM") {
    bullets.push(
      "This seller has a moderate risk profile. Buyers should review recent feedback before making large purchases."
    );
  } else if (riskLevel === "HIGH") {
    bullets.push(
      "This seller has a high risk profile. Proceed with caution and read individual reviews carefully."
    );
  }

  return { summaryText: main, summaryBullets: bullets };
}

// GET /api/seller/:sellerId/trust
router.get("/:sellerId/trust", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const reviews = await Review.find({ sellerId }).lean();
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return res.json({
        sellerId,
        trustScore: null,
        trustStars: null,
        riskLevel: "UNKNOWN",
        reasons: [],
        stats: {
          totalReviews: 0,
        },
        message: "No reviews yet for this seller.",
        summaryText: "No reviews yet for this seller.",
        summaryBullets: [],
      });
    }

    let sumRating = 0;
    let ratingCount = 0;
    let sumSentiment = 0;
    let sentimentCount = 0;

    let fraudCount = 0;
    let nonDeliveryCount = 0;
    let fakeProductCount = 0;

    let refundRequestedCount = 0;
    let refundApprovedCount = 0;
    let disputeCount = 0;
    let delayedCount = 0;

    for (const r of reviews) {
      if (typeof r.rating === "number") {
        sumRating += r.rating;
        ratingCount++;
      }
      if (typeof r.sentimentScore === "number") {
        sumSentiment += r.sentimentScore;
        sentimentCount++;
      }

      if (r.fraudFlags?.possibleScam) fraudCount++;
      if (r.fraudFlags?.nonDelivery) nonDeliveryCount++;
      if (r.fraudFlags?.fakeProduct) fakeProductCount++;

      if (r.refundRequested) refundRequestedCount++;
      if (r.refundApproved) refundApprovedCount++;
      if (r.disputeRaised) disputeCount++;
      if (r.wasDelayed) delayedCount++;
    }

    const avgRating = ratingCount ? sumRating / ratingCount : null;
    const avgSentiment = sentimentCount ? sumSentiment / sentimentCount : null;

    const fraudReviewRate = fraudCount / totalReviews;
    const nonDeliveryRate = nonDeliveryCount / totalReviews;
    const fakeProductRate = fakeProductCount / totalReviews;
    const refundRequestedRate = refundRequestedCount / totalReviews;
    const refundApprovedRate = refundApprovedCount / totalReviews;
    const disputeRate = disputeCount / totalReviews;
    const lateDeliveryRate = delayedCount / totalReviews;

    let trustScore = 50;

    // A) review quality
    if (avgRating != null) {
      trustScore += (avgRating - 3) * 10; // -20..+20
    }
    if (avgSentiment != null) {
      trustScore += avgSentiment * 10; // -10..+10
    }

    // B) penalties
    trustScore -= fraudReviewRate * 40;
    trustScore -= refundRequestedRate * 15;
    trustScore -= disputeRate * 25;
    trustScore -= lateDeliveryRate * 10;

    // C) more reviews = more confidence
    trustScore += Math.min(totalReviews, 50) / 2; // up to +25

    trustScore = clamp(Math.round(trustScore), 0, 100);
    const trustStars = scoreToStars(trustScore);

    const stats = {
      totalReviews,
      avgRating,
      avgSentiment,
      fraudReviewRate,
      nonDeliveryRate,
      fakeProductRate,
      refundRequestedRate,
      refundApprovedRate,
      disputeRate,
      lateDeliveryRate,
    };

    const { riskLevel, reasons } = classifyRisk(trustScore, stats);

    // 🔹 build summary text + bullets from stats
    const { summaryText, summaryBullets } = buildSummary(
      trustScore,
      riskLevel,
      stats
    );

    return res.json({
      sellerId,
      trustScore,
      trustStars,
      riskLevel,
      reasons,
      stats,
      summaryText,
      summaryBullets,
    });
  } catch (err) {
    console.error("Error computing seller trust:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

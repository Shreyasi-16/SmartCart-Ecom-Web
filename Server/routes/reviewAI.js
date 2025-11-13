const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");

const router = express.Router();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_SENTIMENT_MODEL =
  process.env.HF_SENTIMENT_MODEL ||
  "cardiffnlp/twitter-roberta-base-sentiment-latest";

const HF_SUMMARY_MODEL =
  process.env.HF_SUMMARY_MODEL || "facebook/bart-large-cnn";

// dynamic import for node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

if (!HF_API_TOKEN) {
  console.warn(
    "[reviewAI] ⚠️ HF_API_TOKEN not set. HF routes will fail until configured."
  );
}

/* ----------------------------- Helper: sellerId ----------------------------- */
function sellerFilter(sellerId) {
  const conds = [{ sellerId }];
  if (mongoose.Types.ObjectId.isValid(sellerId)) {
    conds.push({ sellerId: new mongoose.Types.ObjectId(sellerId) });
  }
  return { $or: conds };
}

/* ----------------------------- HF Core Helper ----------------------------- */
async function callHF(model, inputsOrPayload) {
  const url = `https://router.huggingface.co/hf-inference/models/${model}`;
  const payload =
    typeof inputsOrPayload === "string"
      ? { inputs: inputsOrPayload }
      : inputsOrPayload;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HF API error (${res.status}): ${txt}`);
  }
  return res.json();
}

/* ----------------------------- Summarization ----------------------------- */
function buildCommentsText(reviews) {
  return reviews
    .map((r) =>
      `- ${String(r.comment || r.autoComment || "")
        .replace(/\s+/g, " ")
        .trim()}`
    )
    .filter((line) => line.length > 2)
    .join("\n");
}

async function hfSummarizeComments(model, reviews) {
  const commentsText = buildCommentsText(reviews);
  const prompt =
    "Summarize these buyer comments in 2–3 sentences. Focus on product quality, delivery speed, seller communication, and any fraud/non-delivery mentions. Do not add facts that are not implied by the comments.\n\n" +
    commentsText;

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 120,
      return_full_text: false,
      temperature: 0.2,
      top_p: 0.95,
      repetition_penalty: 1.1,
    },
    options: { wait_for_model: true },
  };

  const out = await callHF(model, payload);
  let txt = null;

  if (Array.isArray(out)) {
    const first = out[0] || {};
    txt = first.summary_text || first.generated_text || null;
  } else if (out && typeof out === "object") {
    txt = out.summary_text || out.generated_text || null;
  } else if (typeof out === "string") {
    txt = out;
  }

  if (!txt) return null;

  let cleaned = String(txt).trim();
  cleaned = cleaned.replace(/^[“"']|[”"']$/g, "").trim();
  cleaned = cleaned
    .replace(/^you are .*?(?:\.\s*|\n)/i, "")
    .replace(/^summarize( the following)? .*?(?:\.\s*|\n)/i, "")
    .replace(/^write 2[\u2013-]3 sentences.*?(?:\.\s*|\n)/i, "")
    .trim();

  if (!cleaned || cleaned.length < 20) return null;
  return cleaned;
}

/* ---------------- Sentiment + Fraud Detection ---------------- */
function mapSentimentToScore(output) {
  if (!Array.isArray(output) || !Array.isArray(output[0])) return null;
  const preds = output[0];
  let best = preds[0];
  for (const p of preds) {
    if (p.score > best.score) best = p;
  }

  const label = (best.label || "").toLowerCase();

  if (
    label.includes("negative") ||
    label === "1 star" ||
    label.startsWith("1") ||
    label.startsWith("2")
  )
    return -1;
  if (
    label.includes("positive") ||
    label === "5 stars" ||
    label.startsWith("5") ||
    label.startsWith("4")
  )
    return 1;
  return 0;
}

function detectFraudFlags(comment, sentimentScore) {
  const text = (comment || "").toLowerCase();
  const contains = (w) => text.includes(w);

  const possibleScam =
    contains("scam") ||
    contains("fraud") ||
    contains("cheat") ||
    contains("scammer") ||
    contains("fraudulent");

  const nonDelivery =
    contains("not delivered") ||
    contains("never arrived") ||
    contains("didn't receive") ||
    contains("didnt receive") ||
    contains("no delivery");

  const fakeProduct =
    contains("fake") ||
    contains("counterfeit") ||
    contains("not original") ||
    contains("not as described") ||
    contains("different product");

  return {
    possibleScam: !!(possibleScam && sentimentScore === -1),
    nonDelivery: !!nonDelivery,
    fakeProduct: !!fakeProduct,
  };
}

/* --------------------- Rule-Based Fallback Summary --------------------- */
function buildCommentSummary(reviews) {
  const total = reviews.length;
  if (!total) return "This seller has no review comments yet.";

  let pos = 0,
    neg = 0,
    neu = 0;
  let mentionsLate = 0,
    mentionsFast = 0,
    mentionsQualityGood = 0,
    mentionsQualityBad = 0,
    mentionsCommGood = 0,
    mentionsCommBad = 0;

  for (const r of reviews) {
    const s = typeof r.sentimentScore === "number" ? r.sentimentScore : 0;
    if (s > 0) pos++;
    else if (s < 0) neg++;
    else neu++;

    const t = (r.comment || r.autoComment || "").toLowerCase();
    if (t.includes("late") || t.includes("delayed")) mentionsLate++;
    if (t.includes("fast") || t.includes("quick")) mentionsFast++;
    if (
      t.includes("good quality") ||
      t.includes("great quality") ||
      t.includes("excellent quality")
    )
      mentionsQualityGood++;
    if (
      t.includes("bad quality") ||
      t.includes("poor quality") ||
      t.includes("low quality")
    )
      mentionsQualityBad++;
    if (
      t.includes("responsive") ||
      t.includes("helpful") ||
      t.includes("good communication")
    )
      mentionsCommGood++;
    if (
      t.includes("no response") ||
      t.includes("unresponsive") ||
      t.includes("bad communication")
    )
      mentionsCommBad++;
  }

  const posPct = Math.round((pos / total) * 100);
  const negPct = Math.round((neg / total) * 100);

  const parts = [];
  if (posPct >= 55 && negPct <= 15) {
    parts.push(`Most buyers (${posPct}%) leave positive comments about this seller.`);
  } else if (negPct >= 30) {
    parts.push(`Many buyers (${negPct}%) leave negative comments, indicating potential issues.`);
  } else {
    parts.push(`Buyer feedback is mixed, with about ${posPct}% positive and ${negPct}% negative comments.`);
  }
  if (mentionsFast > mentionsLate && mentionsFast > 0)
    parts.push("Buyers often mention fast delivery.");
  else if (mentionsLate > 0)
    parts.push("Several reviews complain about delayed delivery.");
  if (mentionsQualityGood > mentionsQualityBad && mentionsQualityGood > 0)
    parts.push("Product quality is frequently praised.");
  else if (mentionsQualityBad > 0)
    parts.push("Some buyers complain about low product quality.");
  if (mentionsCommGood > mentionsCommBad && mentionsCommGood > 0)
    parts.push("Seller communication is usually helpful or responsive.");
  else if (mentionsCommBad > 0)
    parts.push("A number of reviews mention poor or unresponsive communication.");

  return parts.join(" ");
}

/* --------------------------------- Routes --------------------------------- */

// POST /api/ai/analyze-reviews/:sellerId
router.post("/analyze-reviews/:sellerId", async (req, res) => {
  try {
    if (!HF_API_TOKEN)
      return res.status(500).json({ error: "HF_API_TOKEN not configured." });

    const { sellerId } = req.params;

    // include both comment and autoComment
    const reviews = await Review.find({
      ...sellerFilter(sellerId),
      $or: [
        { comment: { $exists: true, $ne: "" } },
        { autoComment: { $exists: true, $ne: "" } },
      ],
    }).lean();

    if (!reviews.length)
      return res.json({
        sellerId,
        updatedCount: 0,
        aiSummary: "No comments available for this seller.",
      });

    let updatedCount = 0;
    for (const r of reviews) {
      const comment = (r.comment || r.autoComment || "").trim();
      if (!comment) continue;

      let sentimentScore = r.sentimentScore ?? null;
      if (sentimentScore === null) {
        try {
          const out = await callHF(HF_SENTIMENT_MODEL, comment);
          sentimentScore = mapSentimentToScore(out);
        } catch (e) {
          console.error(`Sentiment error ${r._id}:`, e.message);
        }
      }

      const fraudFlags = detectFraudFlags(comment, sentimentScore);

      await Review.updateOne(
        { _id: r._id },
        { $set: { sentimentScore, fraudFlags } }
      );
      updatedCount++;
    }

    const updatedReviews = await Review.find({
      ...sellerFilter(sellerId),
      $or: [
        { comment: { $exists: true, $ne: "" } },
        { autoComment: { $exists: true, $ne: "" } },
      ],
    }).lean();

    let aiSummary = null;
    try {
      aiSummary = await hfSummarizeComments(HF_SUMMARY_MODEL, updatedReviews);
    } catch (e) {
      console.error("Error calling summary LLM:", e.message);
    }

    if (!aiSummary) aiSummary = buildCommentSummary(updatedReviews);
    return res.json({ sellerId, updatedCount, aiSummary });
  } catch (err) {
    console.error("Error in analyze-reviews AI route:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ai/summary/:sellerId
router.get("/summary/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const reviews = await Review.find({
      ...sellerFilter(sellerId),
      $or: [
        { comment: { $exists: true, $ne: "" } },
        { autoComment: { $exists: true, $ne: "" } },
      ],
    }).lean();

    if (!reviews.length)
      return res.json({
        sellerId,
        totalReviews: 0,
        summary: "This seller has no review comments yet.",
      });

    const summaryText = buildCommentSummary(reviews);
    return res.json({ sellerId, totalReviews: reviews.length, summary: summaryText });
  } catch (err) {
    console.error("Error generating comment summary:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

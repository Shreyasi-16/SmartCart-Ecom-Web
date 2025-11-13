const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // keep this or use global fetch in Node 18+
const UserRecommendations = require("../models/UserRecommendations");

// Helper: remove heavy fields (like embeddings) before sending to browser / saving
function sanitizeProducts(products, { removeEmbedding = true } = {}) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => {
    const copy = { ...p };
    if (removeEmbedding && copy.embedding) delete copy.embedding;
    return copy;
  });
}

// GET /api/recommendations?userId=<mongoId>
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    const n = req.query.n || 28;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Step 1: Try cached recommendations
    const cached = await UserRecommendations.findOne({ userId }).lean();
    if (cached && Array.isArray(cached.recommendations) && cached.recommendations.length > 0) {
      console.log(`🟢 Returning cached recommendations for user ${userId}`);
      // send sanitized (no embeddings)
      return res.json({
        source: "cache",
        recommendations: sanitizeProducts(cached.recommendations, { removeEmbedding: true }),
        count: cached.recommendations.length,
      });
    }

    // Step 2: Fetch fresh recommendations from Flask (force IPv4)
    console.log(`🔁 Fetching from Flask for user ${userId}`);

    // fetch timeout using AbortController
    const controller = new AbortController();
    const timeoutMs = 10000; // 10s
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const flaskUrl = `http://127.0.0.1:5001/recommend?user_id=${encodeURIComponent(userId)}&n=${encodeURIComponent(n)}`;

    let flaskRes;
    try {
      flaskRes = await fetch(flaskUrl, { signal: controller.signal });
    } catch (err) {
      if (err.name === "AbortError") {
        console.error("⏱️ Fetch to Flask timed out");
        return res.status(504).json({ error: "upstream_timeout", message: "Flask did not respond in time" });
      }
      console.error("❌ Error contacting Flask:", err);
      return res.status(502).json({ error: "upstream_error", message: err.message });
    } finally {
      clearTimeout(timeout);
    }

    // Check HTTP status
    const rawText = await flaskRes.text().catch(() => null);
    if (!flaskRes.ok) {
      console.error("⚠️ Flask returned non-OK:", flaskRes.status, rawText);
      return res.status(502).json({ error: "upstream_error", status: flaskRes.status, body: rawText });
    }

    let recData;
    try {
      recData = rawText ? JSON.parse(rawText) : {};
    } catch (err) {
      console.error("❌ Failed to parse Flask JSON:", err, "raw:", rawText);
      return res.status(502).json({ error: "invalid_upstream_json", message: err.message });
    }

    const recs = Array.isArray(recData.recommendations) ? recData.recommendations : [];

    // Step 3: Save sanitized recommendations in DB (strip embeddings to save space)
    if (recs.length > 0) {
      const sanitized = sanitizeProducts(recs, { removeEmbedding: true });
      try {
        await UserRecommendations.findOneAndUpdate(
          { userId },
          { $set: { recommendations: sanitized, updatedAt: new Date() } },
          { upsert: true, new: true }
        );
        console.log(`✅ Saved ${sanitized.length} recommendations to MongoDB for user ${userId}`);
      } catch (err) {
        console.error("⚠️ Failed to save recommendations to Mongo:", err);
        // Non-fatal: we still return the recommendations to the client
      }
    } else {
      console.log("⚠️ No recommendations returned from Flask");
    }

    // Step 4: Return sanitized payload to frontend
    return res.json({
      source: "flask",
      recommendations: sanitizeProducts(recs, { removeEmbedding: true }),
      count: recData.count || recs.length,
    });
  } catch (err) {
    console.error("❌ Recommendation fetch error (route):", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
});

module.exports = router;

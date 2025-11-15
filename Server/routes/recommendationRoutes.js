const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const UserRecommendations = require("../models/UserRecommendations");

// Remove heavy fields (embedding)
function sanitizeProducts(products, { removeEmbedding = true } = {}) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => {
    const copy = { ...p };
    if (removeEmbedding && copy.embedding) delete copy.embedding;
    return copy;
  });
}

// GET /api/recommendations
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    const n = req.query.n || 28;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // 1) Check cached recommendations
    const cached = await UserRecommendations.findOne({ userId }).lean();
    if (cached?.recommendations?.length > 0) {
      console.log(`🟢 Cache hit for user ${userId}`);
      return res.json({
        source: "cache",
        recommendations: sanitizeProducts(cached.recommendations),
        count: cached.recommendations.length,
      });
    }

    // 2) Fetch from Flask
    console.log(`🔁 Fetching from Flask for user ${userId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const flaskUrl = `http://127.0.0.1:5001/recommend?user_id=${encodeURIComponent(
      userId
    )}&n=${encodeURIComponent(n)}`;

    let flaskRes;
    try {
      flaskRes = await fetch(flaskUrl, { signal: controller.signal });
    } catch (err) {
      if (err.name === "AbortError") {
        console.error("⏱️ Flask timeout");
        return res
          .status(504)
          .json({ error: "upstream_timeout", message: "Flask timeout" });
      }
      console.error("❌ Flask connection error:", err.message);
      return res
        .status(502)
        .json({ error: "upstream_error", message: err.message });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await flaskRes.text().catch(() => null);

    if (!flaskRes.ok) {
      return res.status(502).json({
        error: "upstream_error",
        status: flaskRes.status,
        body: rawText,
      });
    }

    let recData;
    try {
      recData = rawText ? JSON.parse(rawText) : {};
    } catch (err) {
      console.error("❌ JSON parse error:", err.message);
      return res
        .status(502)
        .json({ error: "invalid_json", message: err.message });
    }

    const recs = Array.isArray(recData.recommendations)
      ? recData.recommendations
      : [];

    // 3) Save sanitized recommendations in DB
    if (recs.length > 0) {
      try {
        const sanitized = sanitizeProducts(recs);
        await UserRecommendations.findOneAndUpdate(
          { userId },
          { $set: { recommendations: sanitized, updatedAt: new Date() } },
          { upsert: true }
        );
        console.log(`💾 Saved ${sanitized.length} recs for user ${userId}`);
      } catch (err) {
        console.error("⚠️ Mongo save error:", err.message);
      }
    }

    // 4) Return to frontend
    return res.json({
      source: "flask",
      recommendations: sanitizeProducts(recs),
      count: recData.count || recs.length,
    });
  } catch (err) {
    console.error("❌ Route error:", err.message);
    return res
      .status(500)
      .json({ error: "internal_error", message: err.message });
  }
});

module.exports = router;

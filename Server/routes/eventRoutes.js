// Server/routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { logEvent } = require("../controllers/eventController");
const Event = require("../models/Event");
const Product = require("../models/Product");

// ✅ POST /api/events/log
router.post("/events/log", async (req, res) => {
  try {
    const { userId, eventType, productId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    console.log("🧩 Received Event:", { userId, eventType, productId });

    // 🗒️ Step 1: Log the event in your DB
    await logEvent(req, res, true); // 'true' skips direct response sending

    // ⚡ Step 2: Fetch updated recommendations from Flask
    console.log(`🔁 Fetching real-time recommendations for user ${userId}...`);
    const flaskRes = await fetch(
      `http://localhost:5001/recommend?user_id=${userId}`
    );

    if (!flaskRes.ok) {
      const text = await flaskRes.text();
      console.error("❌ Flask Error:", flaskRes.status, text);
      return res
        .status(flaskRes.status)
        .json({ error: "Flask service failed", details: text });
    }

    const recData = await flaskRes.json();

    // 🧠 Step 3: Return confirmation + recommendations
    res.status(200).json({
      message: "Event logged and recommendations updated",
      recommendations: recData.recommendations || [],
      count: recData.count || 0,
    });

    console.log(
      `✅ Sent ${recData.count || 0} recommendations for user ${userId}`
    );
  } catch (error) {
    console.error("❌ Event log or recommendation trigger failed:", error);
    res.status(500).json({
      error: "Failed to log event or get recommendations",
      details: error.message,
    });
  }
});

// ✅ GET /api/recently-viewed/:userId
router.get("/recently-viewed/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const events = await Event.find({ userId, eventType: "view" })
      .sort({ timestamp: -1 })
      .limit(8);

    const productIds = [...new Set(events.map((e) => e.productId.toString()))]; // remove duplicates
    const products = await Product.find({ _id: { $in: productIds } });

    res.json({ products });
  } catch (err) {
    console.error("❌ Error fetching recently viewed:", err);
    res.status(500).json({ error: "Failed to fetch recently viewed products" });
  }
});

module.exports = router;

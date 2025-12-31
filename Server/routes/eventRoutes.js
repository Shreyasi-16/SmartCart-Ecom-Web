// Server/routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { logEvent } = require("../controllers/eventController");
const Event = require("../models/Event");
const Product = require("../models/Product");

// ===============================
// 🚀 POST /api/events/log
// ===============================
// ===============================
// 🚀 POST /api/events/log
// ===============================
router.post("/log", async (req, res) => {
  console.log("====================================");
  console.log("📥 NEW EVENT REQUEST ARRIVED");
  console.log("📦 Request Body:", req.body);
  console.log("====================================");

  try {
    const { userId, eventType, productId, searchQuery, location } = req.body;

    if (!userId || !eventType) {
      console.log("❌ Missing userId or eventType");
      return res.status(400).json({ error: "userId & eventType required" });
    }

    

const event = await logEvent(req.body);

console.log("📌 logEvent() returned:", event);


    if (!event) {
      console.log("❌ ERROR → logEvent() returned NULL / UNDEFINED");
    } else {
      // console.log("✅ Event saved in MongoDB:", event._id);
    }

    // 🧠 Fetch updated recommendations from Flask
    const flaskURL = `http://localhost:5001/recommend?user_id=${userId}`;
    console.log("🌐 Calling Flask:", flaskURL);

    let flaskRes;
    try {
      flaskRes = await fetch(flaskURL);
      // console.log("📥 Flask RAW RESPONSE:", flaskRes.status, flaskRes.statusText);
    } catch (flaskErr) {
      console.error("🚨 Flask Fetch FAILED:", flaskErr.message);
      return res.status(500).json({
        error: "Flask API unreachable",
        details: flaskErr.message,
      });
    }

    let recData;
    try {
      recData = await flaskRes.json();
      
    } catch (jsonErr) {
      console.error("⚠ Flask JSON Parse FAILED");
      recData = { recommendations: [] };
    }

    console.log("🎯 Sending final response to frontend...");
    console.log("====================================");

    return res.status(200).json({
      message: "Event logged successfully",
      event: event || null,
      recommendations: recData.recommendations || [],
    });
  } catch (error) {
    console.error("❌ FINAL ROUTE ERROR:", error);

    return res.status(500).json({
      error: "Failed to log event",
      details: error.message,
    });
  }
});


// ===============================
// GET: /api/events/recently-viewed/:userId
// ===============================
router.get("/recently-viewed/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const events = await Event.find({
      userId,
      eventType: "view",
    })
      .sort({ timestamp: -1 })
      .limit(10);  // last 10 views

    const productIds = [...new Set(events.map(e => e.productId))]; // unique

    const products = await Product.find({
      _id: { $in: productIds }
    });

    res.json({ products });
  } catch (err) {
    console.error("❌ Recently Viewed Error:", err);
    res.status(500).json({ error: "Failed to fetch recently viewed" });
  }
});


module.exports = router;
// backend/routes/paymentStatus.js
const express = require("express");
const router = express.Router();
const PaymentStatus = require("../models/PaymentStatus");

// Buyer confirms payment (e.g., uploads UPI screenshot)
router.post("/buyer-confirm", async (req, res) => {
  try {
    const { productId, buyerId, sellerId, amount } = req.body;
    if (!productId || !buyerId || !sellerId)
      return res.status(400).json({ message: "Missing required fields" });

    // 🚫 Check if another buyer already paid / completed
    const existing = await PaymentStatus.findOne({
      productId,
      status: { $in: ["buyer_confirmed", "completed"] }
    });

    if (existing && existing.buyerId.toString() !== buyerId) {
      return res.status(403).json({
        message: "Payment already initiated by another buyer. Product is pending sale."
      });
    }

    let record = await PaymentStatus.findOne({ productId, buyerId });
    if (!record) {
      record = new PaymentStatus({
        productId,
        buyerId,
        sellerId,
        amount: amount || 0,
        status: "buyer_confirmed",
      });
    } else {
      record.status = "buyer_confirmed";
      record.amount = amount ?? record.amount;
      record.sellerId = sellerId ?? record.sellerId;
    }

    await record.save();
    res.json({ message: "Buyer marked payment as done", record });
  } catch (err) {
    console.error("Buyer confirm error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Seller confirms payment received (marks completed)
router.post("/seller-confirm", async (req, res) => {
  try {
    const { productId, buyerId, sellerId } = req.body;
    if (!productId || !buyerId || !sellerId)
      return res.status(400).json({ message: "Missing required fields" });

    const record = await PaymentStatus.findOne({ productId, buyerId, sellerId });
    if (!record) return res.status(404).json({ message: "Payment not found" });

    record.status = "completed";
    await record.save();

    res.json({ message: "Seller confirmed payment received", record });
  } catch (err) {
    console.error("Seller confirm error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /api/payment/status
router.post("/status", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });

    const record = buyerId ? await PaymentStatus.findOne({ buyerId, productId }) : null;

    // If any completed payment exists for this product -> sold out
    const completed = await PaymentStatus.findOne({ productId, status: "completed" });
    const soldOut = !!completed;

    res.json({
      hasPurchased: !!(record && ["buyer_confirmed", "completed"].includes(record.status)),
      paymentStatus: record?.status || null,
      soldOut,
    });
  } catch (err) {
    console.error("Payment status error:", err);
    res.status(500).json({ message: "server error" });
  }
});

// Get all payment records for a seller
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const payments = await PaymentStatus.find({ sellerId })
      .populate("buyerId", "name email")
      .populate("productId", "title price photos");

    res.json(payments);
  } catch (err) {
    console.error("Error fetching seller payments:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Check ONLY if buyer purchased (for enabling review)
router.post("/hasPurchased", async (req, res) => {
  try {
    const { buyerId, productId } = req.body;

    if (!buyerId || !productId) {
      return res.status(400).json({ hasPurchased: false });
    }

    const record = await PaymentStatus.findOne({
      buyerId,
      productId,
      status: "completed", // only completed means purchase is finished
    });

    res.json({ hasPurchased: !!record });
  } catch (err) {
    console.error("hasPurchased error:", err);
    res.status(500).json({ hasPurchased: false });
  }
});

module.exports = router;

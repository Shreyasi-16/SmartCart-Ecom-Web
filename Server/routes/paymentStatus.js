const express = require("express");
const router = express.Router();
const PaymentStatus = require("../models/PaymentStatus");

// ✅ Buyer marks as paid
router.post("/buyer-confirm", async (req, res) => {
  try {
    const { productId, buyerId, sellerId, amount } = req.body;
    if (!productId || !buyerId || !sellerId)
      return res.status(400).json({ message: "Missing required fields" });

    let record = await PaymentStatus.findOne({ productId, buyerId });
    if (!record) {
      record = new PaymentStatus({
        productId,
        buyerId,
        sellerId,
        amount,
        status: "buyer_confirmed",
      });
    } else {
      record.status = "buyer_confirmed";
    }

    await record.save();
    res.json({ message: "Buyer marked payment as done", record });
  } catch (err) {
    console.error("Buyer confirm error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Seller confirms payment received
router.post("/seller-confirm", async (req, res) => {
  try {
    const { productId, buyerId, sellerId } = req.body;

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

// ✅ Seller fetches all payment statuses
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const records = await PaymentStatus.find({ sellerId: req.params.sellerId })
      .populate("buyerId", "name email")
      .populate("productId", "title price");
    res.json(records);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;

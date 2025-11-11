const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PaymentProof = require("../models/PaymentProof");

// ----------------------
// 📁 Multer setup
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/paymentProofs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ----------------------
// ✅ Buyer submits proof
// ----------------------
router.post("/submit", upload.single("screenshot"), async (req, res) => {
  try {
    const { buyerId, sellerId, productId, transactionId, amount } = req.body;

    // Allow EITHER transactionId OR screenshot
    if (!buyerId || !sellerId || !productId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!transactionId && !req.file) {
      return res.status(400).json({
        message: "Provide either Transaction ID or upload a screenshot",
      });
    }

    // Prevent duplicate transaction ID
    if (transactionId) {
      const exists = await PaymentProof.findOne({ buyerId, productId, transactionId });
      if (exists) return res.status(400).json({ message: "Transaction already submitted" });
    }

    const screenshotPath = req.file ? `/uploads/paymentProofs/${req.file.filename}` : null;

    const proof = new PaymentProof({
      buyerId,
      sellerId,
      productId,
      transactionId,
      amount,
      screenshotPath,
      status: "pending",
    });

    await proof.save();
    res.json({ message: "Payment proof submitted successfully", proof });
  } catch (err) {
    console.error("PaymentProof Submit Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ----------------------
// ✅ Seller verifies or rejects
// ----------------------
router.post("/verify", async (req, res) => {
  try {
    const { proofId, verified } = req.body;
    const proof = await PaymentProof.findById(proofId);
    if (!proof) return res.status(404).json({ message: "Proof not found" });

    proof.status = verified ? "verified" : "rejected";
    proof.verifiedAt = new Date();
    await proof.save();

    res.json({ message: `Payment ${verified ? "verified" : "rejected"}`, proof });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// ✅ Fetch proofs for a seller
// ----------------------
router.get("/seller/:sellerId", async (req, res) => {
  try {
    const proofs = await PaymentProof.find({ sellerId: req.params.sellerId })
      .populate("buyerId", "name email")
      .populate("productId", "title price");
    res.json(proofs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// ✅ Fetch proofs for a buyer
// ----------------------
router.get("/buyer/:buyerId", async (req, res) => {
  try {
    const proofs = await PaymentProof.find({ buyerId: req.params.buyerId })
      .populate("sellerId", "name email")
      .populate("productId", "title price");
    res.json(proofs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------------
// ✅ Admin fetches all
// ----------------------
router.get("/all", async (req, res) => {
  try {
    const proofs = await PaymentProof.find()
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .populate("productId", "title");
    res.json(proofs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

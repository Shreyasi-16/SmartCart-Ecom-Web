// routes/wishlist.js
const express = require("express");
const router = express.Router();
const Wishlist = require("../models/Wishlist");

// Get wishlist items for a user
router.get("/:userId", async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.params.userId }).populate("productId");
    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add product to wishlist
router.post("/", async (req, res) => {
  const { userId, productId } = req.body;

  try {
    // Check if already in wishlist
    const exists = await Wishlist.findOne({ userId, productId });
    if (exists) return res.status(400).json({ message: "Product already in wishlist" });

    const newItem = new Wishlist({ userId, productId });
    await newItem.save();
    res.json({ message: "Added to wishlist", item: newItem });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove product from wishlist
router.delete("/:userId/:productId", async (req, res) => {
  try {
    const deleted = await Wishlist.findOneAndDelete({
      userId: req.params.userId,
      productId: req.params.productId,
    });
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require("express");
const Product = require("../models/Product"); 
const User = require("../models/User");

const router = express.Router();

// POST /api/sell
router.post("/", async (req, res) => {
  try {
    const { title, description, price, state, city, categoryId, attributes, photos, seller,locationMode,gpsLocation,manualLocation } = req.body;

    if (!title || !categoryId) {
      return res.status(400).json({ error: "Title and category are required" });
    }

    // 🔥 make sure "seller" is coming from frontend
    const user = await User.findOne({ uid: seller });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newProduct = new Product({
      title,
      description,
      price,
      state,
      city,
      categoryId,
      attributes,
      photos,
      seller: user._id, 
      locationMode,
      gpsLocation,
      manualLocation,// store ObjectId reference
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product inserted successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("❌ Error inserting product:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

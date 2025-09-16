const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product"); // ✅ import schema properly

const router = express.Router();

// POST /api/sell
router.post("/", async (req, res) => {
  try {
    const { title, description, price, state, city, categoryId, attributes, photos } = req.body;

    if (!title || !categoryId) {
      return res.status(400).json({ error: "Title and category are required" });
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
    });

    await newProduct.save();

    res.status(201).json({
      message: "Product inserted successfully",
      product: newProduct,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

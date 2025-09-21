// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // your Mongoose model

// Fetch all products or filter by category/subcategory
router.get("/productFilters", async (req, res) => {
  try {
    const { category, subcategory, price, sizes } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    if (price) filter.price = { $lte: Number(price) };

    if (sizes) {
      filter.sizes = { $in: sizes.split(",") }; // comma-separated in query
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

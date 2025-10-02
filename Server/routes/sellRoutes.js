const express = require("express");
const Product = require("../models/Product"); 
const User = require("../models/User");
const cloudinary = require("../config/cloudinaryConfig"); 
const router = express.Router();

// POST /api/sell
router.post("/", async (req, res) => {
  try {
    const { title, description, price, state, city, categoryId, attributes, photoUrls, seller,locationMode,gpsLocation,manualLocation } = req.body;
     if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: "No photo URLs were provided." });
    }
    if (!title || !categoryId) {
      return res.status(400).json({ error: "Title and category are required" });
    }
     if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: "No photo URLs were provided." });
    }

    // 🔥 make sure "seller" is coming from frontend
    const user = await User.findOne({ uid: seller });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
     const uploadPromises = photoUrls.map((url) => {
          return cloudinary.uploader.upload(url, {
            folder: "SmartCart",
          });
        });
    
        
        
            const uploadResults = await Promise.all(uploadPromises);
            const savedPhotoUrls = uploadResults.map((result) => result.secure_url);
    const newProduct = new Product({
      title,
      description,
      price,
      state,
      city,
      categoryId,
      attributes,
       photos: savedPhotoUrls,
      seller: user._id, 
      locationMode,
      gpsLocation,
      manualLocation,// store ObjectId reference
    });

    await newProduct.save();

    res.status(201).json({
      message: "Ad posted successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("❌ Error inserting product:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 

const express = require("express");
const Product = require("../models/Product"); 
const User = require("../models/User");
const cloudinary = require("../config/cloudinaryConfig");
const axios = require("axios");
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
         // After this:
const uploadResults = await Promise.all(uploadPromises);

// Add this:
const photosWithEmbeddings = await Promise.all(
  uploadResults.map(async (result) => {
    try {
      // Call Python service to get embedding
      const res = await axios.post("http://127.0.0.1:8000/embed", { url: result.secure_url });

      return { url: result.secure_url, embedding: res.data.embedding };
    } catch (err) {
      console.error("❌ Error fetching embedding:", err.message);
      return { url: result.secure_url, embedding: [] };
    }
  })
);
 const savedPhotoUrls = uploadResults.map((result) => result.secure_url);
        
        
           
    const newProduct = new Product({
      title,
      description,
      price,
      state,
      city,
      categoryId,
      attributes,
       photos: photosWithEmbeddings, // ✅ store embeddings per photo
      seller: user._id, 
      locationMode,
      gpsLocation,
      manualLocation,// store ObjectId reference
    });

    await newProduct.save();

    res.status(201).json({
      message: "Ad posted successfully",
      product: newProduct,
      productId: newProduct._id.toString()
    });
  } catch (err) {
    console.error("❌ Error inserting product:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 

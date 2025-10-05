const express = require("express");
const axios = require("axios");
const Product = require("../models/Product");
const router = express.Router();
// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

// In-memory cache
let cachedEmbeddings = [];

// Load embeddings from DB on server start
async function loadEmbeddings() {
  try {
    const products = await Product.find({ "photos.embedding.0": { $exists: true } }).lean();
    cachedEmbeddings = [];

    for (const product of products) {
      if (!product.photos || !Array.isArray(product.photos)) continue;
      for (const photo of product.photos) {
        if (!photo.embedding || !Array.isArray(photo.embedding)) continue;
        cachedEmbeddings.push({
          productId: product._id,
          title: product.title,
          photo: photo.url,
          embedding: photo.embedding
        });
      }
    }

    console.log(`✅ Loaded ${cachedEmbeddings.length} embeddings into cache.`);
  } catch (err) {
    console.error("❌ Failed to load embeddings:", err);
  }
}

// Initial load
loadEmbeddings();

// Optional: refresh cache every X minutes (e.g., 10 minutes)
setInterval(loadEmbeddings, 10 * 60 * 1000);

// POST /api/visual-search
router.post("/", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

  try {
    // 1️⃣ Get embedding for uploaded image
    let queryEmbedding;
    try {
      const embedResp = await axios.post("http://127.0.0.1:8000/embed", { url: imageUrl });
      queryEmbedding = embedResp.data.embedding;
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        console.error("Invalid embedding returned:", embedResp.data);
        return res.status(500).json({ error: "Visual search failed: invalid embedding" });
      }
    } catch (err) {
      console.error("Embedding request failed:", err.response?.data || err.message);
      return res.status(500).json({ error: "Visual search failed: embedding server error" });
    }

    // 2️⃣ Compare with cached embeddings
    const results = cachedEmbeddings
      .map(p => ({
        productId: p.productId,
        title: p.title,
        photo: p.photo,
        similarity: cosineSimilarity(queryEmbedding, p.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // top 10

    res.json(results);

  } catch (err) {
    console.error("❌ Visual search error:", err);
    res.status(500).json({ error: "Visual search failed", details: err.message });
  }
});

module.exports = router;
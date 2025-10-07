// routes/visualSearch.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { spawn } = require("child_process");
const Product = require("../models/Product"); // adjust path

// Helper: get embedding from Python CLIP server
async function getEmbedding(imageUrl) {
  try {
    const res = await axios.post("http://127.0.0.1:8000/embed", { url: imageUrl });
    return res.data.embedding;
  } catch (err) {
    throw new Error("Failed to get embedding: " + err.message);
  }
}

// Helper: query ANN Python script
function queryANN(embedding) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", ["scripts/query_ann.py"]);

    let stdoutData = "";
    let stderrData = "";

    py.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    py.stderr.on("data", (data) => {
      stderrData += data.toString();
      console.error("[ANN stderr]", data.toString().trim());
    });

    py.on("close", (code) => {
      if (stderrData.includes("not found") || stderrData.includes("ANN search failed")) {
        return reject(new Error(stderrData));
      }
      try {
        const results = JSON.parse(stdoutData);
        resolve(results);
      } catch (err) {
        reject(new Error("Failed to parse ANN output: " + err.message + "\nPython stdout: " + stdoutData));
      }
    });

    // Send embedding to Python
    py.stdin.write(JSON.stringify(embedding));
    py.stdin.end();
  });
}

// POST /visual-search
router.post("/", async (req, res) => {
  const { imageUrl } = req.body;

  console.log("\n-----------------------------------------");
  console.log("🖼️ Incoming Visual Search Request");
  console.log("📸 Image URL:", imageUrl);

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required." });
  }

  try {
    console.log("🧠 Requesting embedding from Python server...");
    const embedding = await getEmbedding(imageUrl);
    console.log("✅ Received query embedding:", embedding.length, "dimensions");

    console.log("🔍 Searching ANN index...");
    const results = await queryANN(embedding);
    console.log(`✅ ANN search completed: ${results.length} results`);

    if (!results.length) {
      return res.status(200).json({ message: "No matches found" });
    }

    // Optional: fetch product details from MongoDB
    const productIds = results.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    res.json({
      query: imageUrl,
      topResults: results,
      products,
    });
  } catch (err) {
    console.error("❌ Visual search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

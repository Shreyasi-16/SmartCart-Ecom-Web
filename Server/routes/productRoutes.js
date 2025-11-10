const express = require("express");
const { ObjectId } = require("mongodb");
const uploadToCloudinary = require("../config/cloudinary");
const fileUpload = require("express-fileupload");
const Product = require("../models/Product");

const router = express.Router();
let productsCollection;

router.use(fileUpload());

function setCollection(collection) {
  productsCollection = collection;
}

router.get("/test", (req, res) => res.send("Product route working!"));

// GET /products/fetchProducts  (NO pagination)
router.get("/fetchProducts", async (req, res) => {
  console.log("🟢 /fetchProducts v3", { sort: req.query.sort || "latest" });

  try {
    if (!productsCollection) {
      return res.status(500).json({ ok: false, error: "Collection not set" });
    }

    const {
      categoryId,
      minPrice,
      maxPrice,
      sort = "latest", // "latest" | "priceAsc" | "priceDesc" | "random"
      // page, limit ← removed
    } = req.query;

    // ---- Filter
    const q = {};
    if (categoryId != null && categoryId !== "") {
      const catNum = Number(categoryId);
      q.categoryId = Number.isNaN(catNum) ? categoryId : catNum;
    }
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      q.price = {};
      if (!Number.isNaN(min)) q.price.$gte = min;
      if (!Number.isNaN(max)) q.price.$lte = max;
      if (Object.keys(q.price).length === 0) delete q.price;
    }

    console.log("👉 Filter being applied (v3):", q);

    // ---- Projection
    const findProjection = {
      title: 1,
      price: 1,
      city: 1,
      state: 1,
      createdAt: 1,
      photos: { $slice: 1 },
    };
    const aggProject = {
      title: 1,
      price: 1,
      city: 1,
      state: 1,
      createdAt: 1,
      photos: { $slice: ["$photos.url", 1] }, // keep your original shape
    };

    // ---- Sorted (index-backed)
    if (["latest", "priceAsc", "priceDesc"].includes(sort)) {
      const sortSpec =
        sort === "latest" ? { createdAt: -1 } :
        sort === "priceAsc" ? { price: 1 } :
        { price: -1 };

      const data = await productsCollection
        .find(q, { projection: findProjection })
        .sort(sortSpec)
        .toArray();

      return res.json({ ok: true, total: data.length, data });
    }

    // ---- Random (no pagination): shuffle all matched docs
    if (sort === "random") {
      const total = await productsCollection.countDocuments(q);
      if (!total) return res.json({ ok: true, total: 0, data: [] });

      const pipeline = [
        { $match: q },
        { $sample: { size: total } }, // randomize all
        { $project: aggProject },
      ];
      const data = await productsCollection.aggregate(pipeline, { allowDiskUse: true }).toArray();
      return res.json({ ok: true, total: data.length, data });
    }

    // ---- Fallback → latest
    const data = await productsCollection
      .find(q, { projection: findProjection })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({ ok: true, total: data.length, data });
  } catch (err) {
    console.error("❌ fetchProducts error (v3):", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// SEARCH (unchanged)
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const aggregationPipeline = [
      {
        $search: {
          index: "search_index",
          compound: {
            should: [
              { autocomplete: { query, path: "title",       fuzzy: { maxEdits: 1 } } },
              { autocomplete: { query, path: "description", fuzzy: { maxEdits: 1 } } }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 6 }
    ];
    const results = await productsCollection.aggregate(aggregationPipeline).toArray();
    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Error during search:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// seller products (unchanged)
router.get("/user/:sellerId", async (req, res) => {
  try {
    if (!productsCollection) {
      return res.status(500).json({ message: "Collection not set" });
    }
    const { sellerId } = req.params;
    let sellerObjectId;
    try { sellerObjectId = new ObjectId(sellerId); }
    catch { return res.status(400).json({ message: "Invalid seller ID" }); }

    const products = await productsCollection.find({ seller: sellerObjectId }).toArray();
    if (!products.length) return res.status(404).json({ message: "No products found for this seller" });
    res.status(200).json(products);
  } catch (err) {
    console.error("❌ Error fetching user products:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// product by id (unchanged)
// router.get("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!productsCollection) return res.status(500).json({ message: "Collection not set" });

//     let mongoQuery;
//     try { mongoQuery = { _id: new ObjectId(id) }; }
//     catch { mongoQuery = { _id: id }; }

//     const result = await productsCollection.findOne(mongoQuery);
//     if (!result) return res.status(404).json({ message: "Product not found" });
//     res.status(200).json({ data: result });
//   } catch (err) {
//     console.error("❌ Error fetching product by ID:", err);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// product by id (unchanged)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // use mongoose Product instead of raw collection
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.status(200).json({ data: product });
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /products/:id/attach-model
router.post("/:id/attach-model", async (req, res) => {
  try {
    const prodId = req.params.id;
    const { modelFileId, modelUrls, webodmTaskId, modelStatus } = req.body;

    console.log("[attach-model] incoming for:", prodId);
    console.log("[attach-model] body:", req.body);

    // Build the update object dynamically
    // const update = {};
    // if (modelFileId) update.modelFileId = modelFileId;
    // if (Array.isArray(modelUrls) && modelUrls.length) update.modelUrls = modelUrls;
    // if (webodmTaskId) update.webodmTaskId = webodmTaskId;
    // if (modelStatus) update.modelStatus = modelStatus;

    // // 🟩 Automatically set 'ready' if fileId present
    // if (modelFileId && !update.modelStatus) update.modelStatus = "ready";

    // Build the update object dynamically
const update = {};
if (modelFileId) update.modelFileId = modelFileId;
if (Array.isArray(modelUrls) && modelUrls.length) update.modelUrls = modelUrls;
if (webodmTaskId) update.webodmTaskId = webodmTaskId;
if (modelStatus) update.modelStatus = modelStatus;
if (req.body.lastProgress !== undefined) update.lastProgress = req.body.lastProgress;

// 🟩 Automatically set 'ready' if fileId present
if (modelFileId && !update.modelStatus) update.modelStatus = "ready";

    const product = await Product.findByIdAndUpdate(
      prodId,
      { $set: update },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ Model attached successfully");
    return res.json({ message: "Model attached", product });
  } catch (err) {
    console.error("❌ attach-model error:", err);
    return res
      .status(500)
      .json({ error: err.message || "attach-model failed" });
  }
});
module.exports = { router, setCollection };

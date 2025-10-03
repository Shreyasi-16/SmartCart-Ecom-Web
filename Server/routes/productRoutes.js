const express = require("express");
const { ObjectId } = require("mongodb");
const uploadToCloudinary = require("../config/cloudinary"); // adjust path
const fileUpload = require("express-fileupload");
const router = express.Router();
let productsCollection; // Will be set from index.js
router.use(fileUpload());

// Allow index.js to set the collection
function setCollection(collection) {
  productsCollection = collection;
}

router.get("/test", (req, res) => {
  res.send("Product route working!");
});

// ➡️ ADD PRODUCT WITH CLOUDINARY UPLOAD
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
      sort = "latest",   // "latest" | "priceAsc" | "priceDesc" | "random"
      page = "1",
      limit = "24",
    } = req.query;

    // ---------- Build filter ----------
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

    // ---------- Pagination ----------
    const pageNum  = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(limit) || 24));
    const skip     = (pageNum - 1) * pageSize;

    // ---------- Projection (lightweight) ----------
    const projection = {
      title: 1,
      price: 1,
      city: 1,
      state: 1,
      createdAt: 1,
      //photos: { $slice: ["$photos", 1] }, // only first photo
      photos: { $slice: ["$photos.url", 1] } ,
    };

    // ---------- Fast paths (index-backed) ----------
    if (sort === "latest" || sort === "priceAsc" || sort === "priceDesc") {
      const sortSpec =
        sort === "latest"   ? { createdAt: -1 } :
        sort === "priceAsc" ? { price: 1 } :
                              { price: -1 };

      const total = await productsCollection.countDocuments(q);
      const data  = await productsCollection
        .find(q, { projection })
        .sort(sortSpec)              // ✅ uses index if present
        .skip(skip)
        .limit(pageSize)
        .toArray();

      return res.json({ ok: true, page: pageNum, limit: pageSize, total, data });
    }

    // ---------- Random WITHOUT $rand sort ----------
    // Use $sample with a bounded size (no sort, no memory blowups)
    const sampleSize = Math.min(pageSize, 40);
    const pipeline = [
      { $match: q },
      { $sample: { size: sampleSize } },
      { $project: projection },
    ];

    const data  = await productsCollection
      .aggregate(pipeline, { allowDiskUse: true }) // ✅ safeguard
      .toArray();
    const total = await productsCollection.countDocuments(q);

    return res.json({ ok: true, page: 1, limit: sampleSize, total, data });

  } catch (err) {
    console.error("❌ fetchProducts error (v3):", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



// SEARCH products with Atlas Search autocomplete
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    const aggregationPipeline = [
      {
        $search: {
          index: "search_index",
          compound: {
            should: [
              { autocomplete: { query, path: "title", fuzzy: { maxEdits: 1 } } },
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
    console.error('❌ Error during search:', err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET products by seller MongoDB ObjectId
router.get("/user/:sellerId", async (req, res) => {
  try {
    if (!productsCollection) {
      return res.status(500).json({ message: "Collection not set" });
    }

    const { sellerId } = req.params;

    let sellerObjectId;
    try {
      // Convert to ObjectId
      sellerObjectId = new ObjectId(sellerId);
    } catch {
      return res.status(400).json({ message: "Invalid seller ID" });
    }

    // Query using the ObjectId
    const products = await productsCollection
      .find({ seller: sellerObjectId })
      .toArray();

    if (!products.length) {
      return res.status(404).json({ message: "No products found for this seller" });
    }

    res.status(200).json(products);
  } catch (err) {
    console.error("❌ Error fetching user products:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!productsCollection) {
      return res.status(500).json({ message: "Collection not set" });
    }

    let mongoQuery;
    try {
      mongoQuery = { _id: new ObjectId(id) };
    } catch {
      mongoQuery = { _id: id };
    }

    const result = await productsCollection.findOne(mongoQuery);

    if (!result) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ data: result });
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});







module.exports = { router, setCollection };

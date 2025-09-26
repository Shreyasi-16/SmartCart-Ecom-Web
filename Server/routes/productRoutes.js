const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();
let productsCollection; // Will be set from index.js

// Allow index.js to set the collection
function setCollection(collection) {
  productsCollection = collection;
}

router.get("/test", (req, res) => {
  res.send("Product route working!");
});

router.get("/fetchProducts", async (req, res) => {
  try {
    if (!productsCollection) {
      return res.status(500).json({ message: "Collection not set" });
    }

    let { categoryId, price ,sort} = req.query;
    let filter = {};

    // Convert categoryId from string to number
    if (categoryId) {
      categoryId = Number(categoryId);
      filter.categoryId = categoryId;  // ✅ now matches number type in DB
    }

    // Apply price filter (optional)
    if (price) {
      filter.price = { $lte: Number(price) };
    }

    
    console.log("👉 Filter being applied:", filter); // debug

    //const products = await productsCollection.find(filter).toArray();
    // Use aggregation with $match + $sample
  //   const products = await productsCollection
  //     .aggregate([
  //   { $match: filter },
  //   { $addFields: { rand: { $rand: {} } } }, // add random field
  //   { $sort: { rand: 1 } },                  // sort randomly
  //   { $project: { rand: 0 } }                // remove helper field
  // ])
  // .toArray();

   let products;

    if (sort === "latest") {
      products = await productsCollection
        .find(filter)
        .sort({ createdAt: -1 }) // newest first
        .toArray();
    } else {
      products = await productsCollection
        .aggregate([
          { $match: filter },
          { $addFields: { rand: { $rand: {} } } },
          { $sort: { rand: 1 } },
          { $project: { rand: 0 } }
        ])
        .toArray();
    }

    res.status(200).json(products);
   
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ message: "Internal Server Error" });
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

const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();
let productsCollection; // Will be set from index.js

// Allow index.js to set the collection
function setCollection(collection) {
  productsCollection = collection;
}

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
              { autocomplete: { query, path: "name", fuzzy: { maxEdits: 1 } } },
              { autocomplete: { query, path: "sub_category", fuzzy: { maxEdits: 1 } } }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 6 }
    ];

    const results = await productsCollection.aggregate(aggregationPipeline).toArray();
    res.status(200).json({ data: results });
  } catch (err) {
    console.error('❌ Error during search:', err);
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

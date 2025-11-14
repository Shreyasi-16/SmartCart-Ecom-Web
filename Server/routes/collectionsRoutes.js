const express = require("express");
const router = express.Router();

let db; // MongoDB database reference

function setDB(database) {
  db = database;
}

// GET all collection names + document count
router.get("/all-collections", async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();

    const finalData = await Promise.all(
      collections.map(async (col) => {
        const count = await db.collection(col.name).countDocuments();
        return {
          name: col.name,
          documentCount: count,
        };
      })
    );

    res.json({ success: true, collections: finalData });
  } catch (err) {
    console.error("Error fetching collections:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = { router, setDB };

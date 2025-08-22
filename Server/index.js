const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const { router: productRoutes, setCollection } = require("./routes/productRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use(userRoutes);
app.use("/products", productRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Backend is running!");
});

const mongoUri = process.env.MONGODB_URI;

async function startServer() {
  try {
    // Connect MongoClient (for Atlas Search)
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log("✅ MongoClient connected (for Atlas Search)");

    const db = client.db("SmartCart");
    setCollection(db.collection("products_v1")); // ✅ pass collection to routes

    // Connect Mongoose (for models if needed)
    await mongoose.connect(mongoUri);
    console.log("✅ Mongoose connected (for Models)");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
}

startServer();

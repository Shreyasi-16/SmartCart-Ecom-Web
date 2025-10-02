
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const fileUpload = require("express-fileupload");

const userRoutes = require("./routes/userRoutes");
const { router: productRoutes, setCollection } = require("./routes/productRoutes");
const sellRoutes = require("./routes/sellRoutes");
const updateProfile = require("./routes/updateProfile");
const chatRoutes = require("./routes/chatRoutes");  
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use file upload ONCE
app.use(fileUpload({ useTempFiles: true }));

// Routes
app.use(userRoutes);
app.use("/products", productRoutes);
app.use("/api/sell", sellRoutes);
app.use("/api/users", updateProfile);
app.use("/api/chats", chatRoutes);
app.use("/uploads", express.static("uploads"));


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
    setCollection(db.collection("products")); // ✅ pass collection to routes

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
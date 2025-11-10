const { exec ,span} = require("child_process"); // ✅ for running Python script
const util = require("util");
const path = require("path");
const execAsync = util.promisify(exec);

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
const messageRoutes = require("./routes/messagesRoutes");
const visualSearchRouter = require("./routes/visualSearch");
const pricingRoute = require('./routes/pricing'); //pricing
console.log("[index] pricingRoute typeof:", typeof pricingRoute);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true }));
app.use("/api/visual-search", visualSearchRouter);
// Routes
app.use(userRoutes);
app.use("/products", productRoutes);
app.use("/api/sell", sellRoutes);
app.use("/api/users", updateProfile);
app.use("/api/messages", messageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/uploads", express.static("uploads"));
app.use('/api/pricing', pricingRoute);  //pricing route
console.log("[index] mounted /api/pricing");
const paymentRoutes = require("./routes/payment");
app.use("/api/payment", paymentRoutes);


const modelsRouter = require("./routes/models");
app.use("/api", modelsRouter);

app.use("/models", express.static(path.join(__dirname, "public", "models")));

// webodm route

const webodmRouter = require("./routes/webodm");
app.use("/api/webodm", webodmRouter);

app.use("/api/updates", require("./routes/updates"));

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
    setCollection(db.collection("products")); 

    // Connect Mongoose (for models if needed)
    await mongoose.connect(mongoUri);
    console.log("✅ Mongoose connected (for Models)");
   // 🔹 Run ANN build script automatically
const annBuildPath = path.join(__dirname, "scripts", "build_ann.py"); // ⬅️ correct path
console.log("⚡ Building ANN index...");
exec(`python "${annBuildPath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error running ann_build: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`❌ ann_build stderr: ${stderr}`);
  }
  console.log(`✅ ANN index built successfully:\n${stdout}`);
});

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
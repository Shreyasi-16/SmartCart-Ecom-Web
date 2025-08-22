const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not defined in .env");
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Mongoose connected");
  } catch (err) {
    console.error("❌ Mongoose connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;

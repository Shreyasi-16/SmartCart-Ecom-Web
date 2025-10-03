const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  embedding: { type: [Number], default: [] }, 
});
const productSchema = new mongoose.Schema({
  categoryId: Number,
  title: String,
  description: String,
  price: Number,
  attributes: Object,
  photos: [photoSchema], 
  
  createdAt: { type: Date, default: Date.now },
  
  seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    city: String,
    state: String,

    // Manual address
    manualLocation: {
      address: String,
      pincode: String,
    },

    // GPS location (GeoJSON)
    gpsLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },

    // Which mode is active
    locationMode: { type: String, enum: ["manual", "gps"], default: "manual" },
  


});

module.exports = mongoose.model("Product", productSchema, "products");


const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  categoryId: String,
  title: String,
  description: String,
  price: String,
     
  attributes: Object,
  photos: [String],
  
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

module.exports = mongoose.model("Products", productSchema);

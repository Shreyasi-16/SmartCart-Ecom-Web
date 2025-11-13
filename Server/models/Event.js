// Server/models/Event.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    eventType: {
      type: String,
      enum: ["view", "search", "wishlist", "cart", "purchase", "location_update"],
      required: true,
    },
    searchQuery: { type: String },

    // ✅ Support for both GPS and manual location
    location: {
      mode: { type: String, enum: ["gps", "manual"], default: "manual" },
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },

    timestamp: { type: Date, default: Date.now },
  },
  { collection: "events" }
);

eventSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Event", eventSchema);

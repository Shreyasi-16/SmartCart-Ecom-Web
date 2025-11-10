const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    name: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    aboutMe: { type: String, default: "" },
    photoURL: { type: String, default: "" },
    joinedAt: { type: Date, default: Date.now },
    // ✅ Optional UPI ID (for P2P payments)
    upiId: {
      type: String,
      default: "",
      trim: true,
      match: [/^[\w.\-]{2,256}@[\w]{2,64}$/, "Invalid UPI ID format"], // basic validation
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

  },
  { collection: "users" }
);

// Create 2dsphere index ONLY on geo

userSchema.index({ gpsLocation: "2dsphere" }); 
module.exports = mongoose.model("User", userSchema);

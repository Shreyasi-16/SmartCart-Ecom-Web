// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const fetch = require("node-fetch"); // install with: npm install node-fetch

// ✅ GET user by UID
router.get("/getId/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Helper: reverse geocode using OpenStreetMap
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { "User-Agent": "SmartCart-App" } });
    const data = await res.json();

    let city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      data.address.county ||
      "";
    let state = data.address.state || "";

    return { city, state };
  } catch (err) {
    console.error("Geocoding error:", err);
    return { city: "", state: "" };
  }
}

// ✅ Update profile
router.post("/updateProfile", async (req, res) => {
  try {
    const {
      uid,
      name,
      phone,
      aboutMe,
      photoURL,
      city,
      state,
      locationMode,
      manualLocation,
      gpsLocation,
    } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    let updateFields = {
      name,
      phone,
      aboutMe,
      photoURL,
      locationMode,
    };

    let unsetFields = {};

    if (locationMode === "manual") {
      updateFields.manualLocation = manualLocation || { address: "", pincode: "" };
      updateFields.city = city || "";
      updateFields.state = state || "";
      unsetFields.gpsLocation = "";
    } else if (locationMode === "gps") {
      updateFields.gpsLocation = gpsLocation || { type: "Point", coordinates: [0, 0] };

      if (gpsLocation && gpsLocation.coordinates.length === 2) {
        const [lng, lat] = gpsLocation.coordinates;
        const geoData = await reverseGeocode(lat, lng);
        updateFields.city = geoData.city;
        updateFields.state = geoData.state;
      } else {
        updateFields.city = "";
        updateFields.state = "";
      }

      unsetFields.manualLocation = "";
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      { $set: updateFields, $unset: unsetFields },
      { new: true, upsert: true }
    );

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

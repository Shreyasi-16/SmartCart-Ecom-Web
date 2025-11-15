// controllers/eventController.js
const Event = require("../models/Event");
const UserRecommendations = require("../models/UserRecommendations");
const axios = require("axios");

// PURE LOGIC FUNCTION — NO req/res !!!
exports.logEvent = async ({
  userId,
  eventType,
  productId,
  searchQuery,
  location,
}) => {

  console.log("📌 [logEvent] Function CALLED with:", {
    userId,
    eventType,
    productId,
    searchQuery,
    location,
  });

  if (!userId || !eventType) {
    console.log("❌ [logEvent] Missing userId or eventType");
    throw new Error("userId and eventType are required");
  }

  const eventData = {
    userId,
    eventType,
    productId: productId || null,
    searchQuery: searchQuery || null,
    timestamp: new Date(),
  };

  // Location if sent
  if (location) {
    eventData.location = {
      mode: location.mode || "manual",
      type: "Point",
      coordinates: location.coordinates || [0, 0],
      address: location.address,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
    };
  }

  console.log("🟦 [logEvent] FINAL EVENT DATA:", eventData);

  // 1️⃣ SAVE EVENT
  let savedEvent;

  try {
    savedEvent = await Event.create(eventData);
    console.log("🟩 [logEvent] MongoDB EVENT SAVED:", savedEvent._id);
  } catch (dbErr) {
    console.error("❌ [logEvent] FAILED TO SAVE EVENT:", dbErr.message);
    throw dbErr;
  }

  // 2️⃣ UPDATE RECOMMENDATIONS
  try {
    console.log(
      `🌐 [logEvent] Sending request to Flask for user ${userId}...`
    );

    const flaskRes = await axios.post("http://127.0.0.1:5001/recommend", {
      user_id: userId,
      top_n: 28,
    });

    console.log("📨 [logEvent] Flask response:", flaskRes.data);

    if (flaskRes.data?.recommendations) {
      await UserRecommendations.findOneAndUpdate(
        { userId },
        {
          userId,
          recommendations: flaskRes.data.recommendations,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );

      console.log("🟩 [logEvent] Recommendations updated for", userId);
    }
  } catch (err) {
    console.error("⚠️ [logEvent] Flask recommender error:", err.message);
    // do not throw — event save must still succeed
  }

  console.log("🏁 [logEvent] Returning savedEvent...");
  return savedEvent; // IMPORTANT
};

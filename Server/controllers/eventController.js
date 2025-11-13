const Event = require("../models/Event");
const axios = require("axios");
const UserRecommendations = require("../models/UserRecommendations"); // new model

/**
 * Log user event (view, search, wishlist, cart, purchase, location_update)
 * If `silent = true`, it won't send its own response (for internal use by routes)
 */
exports.logEvent = async (req, res, silent = false) => {
  try {
    const { userId, productId, eventType, searchQuery, location } = req.body;

    if (!userId || !eventType) {
      if (!silent) {
        return res.status(400).json({ message: "userId and eventType required" });
      }
      return;
    }

    const eventData = {
      userId,
      eventType,
      productId: productId || null,
      searchQuery: searchQuery || null,
      timestamp: new Date(),
    };

    // ✅ Handle both GPS and manual location
    if (location) {
      if (location.mode === "gps" && Array.isArray(location.coordinates)) {
        eventData.location = {
          mode: "gps",
          type: "Point",
          coordinates: location.coordinates,
        };
      } else if (location.mode === "manual") {
        eventData.location = {
          mode: "manual",
          type: "Point",
          coordinates: [0, 0],
          address: location.address || "",
          city: location.city || "",
          state: location.state || "",
          pincode: location.pincode || "",
        };
      }
    }

    // 💾 Save the event
    const event = new Event(eventData);
    await event.save();
    console.log(`📝 Event logged: ${eventType} by user ${userId}`);

    // 🔄 Trigger Flask recommender instantly after logging event
    try {
      const flaskRes = await axios.post("http://127.0.0.1:5001/recommend", {
        user_id: userId,
        top_n: 28, // fetch 28 recommendations
      });

      if (flaskRes.data && flaskRes.data.recommendations) {
        const recommendations = flaskRes.data.recommendations;

        // 🗂️ Cache recommendations in MongoDB
        await UserRecommendations.findOneAndUpdate(
          { userId },
          { userId, recommendations, lastUpdated: new Date() },
          { upsert: true, new: true }
        );

        console.log(`✅ Updated recommendations for user ${userId}`);
      }
    } catch (flaskErr) {
      console.error("⚠️ Failed to update recommendations:", flaskErr.message);
    }

    if (!silent) {
      res.status(201).json({
        message: "✅ Event logged successfully",
        event,
      });
    }
  } catch (error) {
    console.error("❌ Event log failed:", error);
    if (!silent) {
      res.status(500).json({
        message: "Failed to log event",
        error: error.message,
      });
    }
  }
};

import axios from "axios";

// Universal function to record user activity
export async function logEvent({
  userId,
  productId,
  eventType,
  searchQuery,
  location, // ✅ Add location
}) {
  try {
    await fetch("http://localhost:5000/api/events/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        productId,
        eventType,
        searchQuery,
        location, // send it if provided
      }),
    });
  } catch (error) {
    console.warn("⚠️ Event log failed:", error.message);
  }
}

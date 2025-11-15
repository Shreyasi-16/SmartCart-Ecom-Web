import axios from "axios";

// Universal function to record user activity
// export async function logEvent({
//   userId,
//   productId,
//   eventType,
//   searchQuery,
//   location, // ✅ Add location
// }) {
//   try {
//     await fetch("http://localhost:5000/api/events/log", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         userId,
//         productId,
//         eventType,
//         searchQuery,
//         location, // send it if provided
//       }),
//     });
//   } catch (error) {
//     console.warn("⚠️ Event log failed:", error.message);
//   }
// }
export async function logEvent({
  userId,
  productId,
  eventType,
  searchQuery,
  location,
}) {
  console.log("📤 logEvent() CALLED WITH:", {
    userId,
    productId,
    eventType,
    searchQuery,
    location,
  });

  const url = "http://localhost:5000/api/events/log";
  console.log("🌐 Sending POST request to:", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        productId,
        eventType,
        searchQuery,
        location,
      }),
    });

    console.log("📥 RAW RESPONSE:", res);

    let data = null;
    try {
      data = await res.json();
      console.log("📦 Parsed JSON Response:", data);
    } catch (jsonErr) {
      console.error("⚠️ JSON PARSE FAILED → response is not JSON");
    }

    if (!res.ok) {
      console.error("❌ logEvent server error:", {
        status: res.status,
        statusText: res.statusText,
        response: data,
      });
      return;
    }

    console.log("✅ Event logged SUCCESSFULLY:", {
      eventType,
      serverResponse: data,
    });

    return data;
  } catch (networkErr) {
    console.error("🚨 logEvent NETWORK ERROR:", networkErr.message);
  }
}

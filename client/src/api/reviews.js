// src/api/reviews.js

const API_BASE = "http://localhost:5000/api"; // change if your backend port is different

export async function fetchSellerReviews(sellerId, { limit = 50, skip = 0 } = {}) {
  const res = await fetch(
    `${API_BASE}/reviews/seller/${sellerId}?limit=${limit}&skip=${skip}`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }
  return res.json();
}

export async function createReview(reviewPayload) {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reviewPayload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create review");
  }

  return res.json();
}

import React, { useEffect, useState } from "react";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

// Remove legacy prefixes that were embedded in comment for old reviews
function cleanLegacyComment(text) {
  if (!text) return "";
  let t = text;

  // Remove "Title: ...."
  t = t.replace(/(^|\s)Title:\s*[^.]*\.?\s*/i, " ");

  // Remove "Public name: ...."
  t = t.replace(/(^|\s)Public name:\s*[^.]*\.?\s*/i, " ");

  // Remove "Product quality: X, Delivery: Y, Communication: Z" (commas or dots)
  t = t.replace(
    /(^|\s)Product\s*quality:\s*\d(?:\s*,|\s*\.|\s*)(?:\s*Delivery:\s*\d(?:\s*,|\s*\.|\s*))?(?:\s*Communication:\s*\d(?:\s*,|\s*\.|\s*))?/i,
    " "
  );

  // Tidy extra spaces
  return t.replace(/\s{2,}/g, " ").trim();
}


/* ---------- Small UI helpers ---------- */
const Star = ({ filled, size = 16 }) => (
  <span
    aria-hidden="true"
    style={{
      color: filled ? "#f59e0b" : "#e5e7eb",
      fontSize: size,
      lineHeight: 1,
      marginRight: 2,
    }}
  >
    ★
  </span>
);

const StarRating = ({ value = 0, size = 16 }) => (
  <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} filled={n <= Number(value || 0)} />
    ))}
  </span>
);

const StarInput = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 22,
          color: star <= value ? "#f59e0b" : "#ccc",
        }}
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
      >
        ★
      </button>
    ))}
  </div>
);

const SubRatingRow = ({ label, value }) =>
  value ? (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div style={{ color: "#374151", fontSize: 14 }}>{label}</div>
      <div style={{ minWidth: 92, textAlign: "right" }}>
        <StarRating value={value} size={14} />
      </div>
    </div>
  ) : null;

/* ---------- Component ---------- */
export default function ReviewSection({
  sellerId,
  buyerId,
  productId,
  orderId,
  disabled,
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [showModal, setShowModal] = useState(false);

  // form state
  const [rating, setRating] = useState(5);
  const [productQuality, setProductQuality] = useState(5);
  const [delivery, setDelivery] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [title, setTitle] = useState("");
  const [publicName, setPublicName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const fetchReviews = async () => {
    if (!sellerId) return;
    setLoading(true);
    setErr(null);
    try {
      // legacy route returns {count, reviews}
      const res = await fetch(`${API_BASE}/api/reviews/seller/${sellerId}`);
      const data = await res.json();
      const parsed = Array.isArray(data)
        ? data
        : data.reviews || data.data || [];
      setReviews(parsed);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReviews([]);
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const canWrite =
    !!sellerId && !!buyerId && !!productId && !!orderId && !disabled;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canWrite) {
      setErr(
        "You must be logged in and viewing a valid order/product to write a review."
      );
      return;
    }
    if (!title.trim() || !publicName.trim()) {
      setErr("Please fill the required fields (Title and Public name).");
      return;
    }

    setSubmitting(true);
    setSuccess(null);
    setErr(null);

    try {
      const payload = {
        sellerId,
        buyerId,
        productId,
        orderId,
        rating,
        productQuality,
        deliveryRating: delivery,
        sellerComm: communication,
        title,
        publicName,
        comment: comment?.trim() || "",
      };

      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post review");

      setSuccess("Review submitted successfully!");
      // reset
      setTitle("");
      setPublicName("");
      setComment("");
      setRating(5);
      setProductQuality(5);
      setDelivery(5);
      setCommunication(5);
      setShowModal(false);

      // refresh list
      fetchReviews();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>Seller Reviews</h3>
        <button
          onClick={() => setShowModal(true)}
          disabled={!canWrite}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: canWrite ? "pointer" : "not-allowed",
            background: "#f7f7f7",
          }}
          title={
            !buyerId
              ? "Login to write a review"
              : disabled
              ? "Sellers cannot review their own product"
              : !productId || !orderId
              ? "Review requires a valid product and order"
              : ""
          }
        >
          Write a review
        </button>
      </div>

      {loading && <p>Loading reviews...</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
      {!loading && !err && reviews.length === 0 && <p>No reviews yet.</p>}

      {reviews.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Top reviews from buyers</h4>

          {reviews.map((r) => {
            const dt =
              r.createdAt &&
              new Date(r.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

            return (
              <div
                key={r._id}
                style={{
                  borderBottom: "1px solid #eee",
                  paddingBottom: 16,
                  marginBottom: 20,
                }}
              >
                {/* Header: avatar + name */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                 
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {r.publicName || "Anonymous"}
                    </div>
                  </div>
                </div>

                {/* Stars + title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StarRating value={r.rating} />
                  <strong style={{ fontSize: 15 }}>
                    {r.title || "Untitled review"}
                  </strong>
                </div>

                {/* Meta */}
                <div style={{ color: "#555", fontSize: 13, marginTop: 2 }}>
                  Reviewed on {dt || "Unknown date"}
                  {r.verifiedPurchase && (
                    <>
                      {" "}
                      ·{" "}
                      <span style={{ color: "#b26a00", fontWeight: 600 }}>
                        Verified Purchase
                      </span>
                    </>
                  )}
                </div>

                {/* Sub-ratings */}
                <div style={{ margin: "8px 0 6px", maxWidth: 420 }}>
                  <SubRatingRow
                    label="Product quality"
                    value={r.productQuality}
                  />
                  <SubRatingRow label="Delivery" value={r.deliveryRating} />
                  <SubRatingRow
                    label="Communication"
                    value={r.sellerComm}
                  />
                </div>

                {/* Comment */}
                {(r.comment && cleanLegacyComment(r.comment)) ? (
                <p style={{ marginTop: 6, color: "#222", lineHeight: 1.5 }}>
                  {cleanLegacyComment(r.comment)}
                </p>
              ) : null}

              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 20,
              width: "90%",
              maxWidth: 520,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Write a Review</h3>
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <label>
                Title your review <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="E.g. Smooth experience"
                style={{ padding: 8 }}
              />

              <label>
                What’s your public name? <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                required
                placeholder="E.g. Tan"
                style={{ padding: 8 }}
              />

              <label>Overall Rating</label>
              <StarInput value={rating} onChange={setRating} />

              <label>Product Quality</label>
              <StarInput
                value={productQuality}
                onChange={setProductQuality}
              />

              <label>Delivery Experience</label>
              <StarInput value={delivery} onChange={setDelivery} />

              <label>Seller Communication</label>
              <StarInput
                value={communication}
                onChange={setCommunication}
              />

              <label>Comments (optional)</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ padding: 8 }}
                placeholder="E.g. Quick shipping, well packed..."
              />

              {err && <p style={{ color: "red" }}>{err}</p>}
              {success && <p style={{ color: "green" }}>{success}</p>}

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#f2f2f2",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "#111",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

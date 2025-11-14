import React, { useEffect, useState } from "react";
import "./ReviewSection.css";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

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
  return t.replace(/\s{2,}/g, " ").trim();
}

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
  <div className="star-input">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className={star <= value ? "filled" : ""}
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
      >
        ★
      </button>
    ))}
  </div>
);

const SubRatingRow = ({ label, value }) =>
  value ? (
    <div className="sub-rating-row">
      <div className="sub-rating-label">{label}</div>
      <div className="sub-rating-stars">
        <StarRating value={value} size={14} />
      </div>
    </div>
  ) : null;

export default function ReviewSection({
  sellerId,
  buyerId,
  productId,
  orderId,
  disabled,
  hasPurchased
})
 {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      const res = await fetch(`${API_BASE}/api/reviews/seller/${sellerId}`);
      const data = await res.json();
      const parsed = Array.isArray(data) ? data : data.reviews || data.data || [];
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
  }, [sellerId]);

  

  
const canWrite =
  !!sellerId &&
  !!buyerId &&
  !!productId &&
  !!orderId &&
  !disabled &&
  hasPurchased;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) return setErr("You cannot write a review.");

    if (!title.trim() || !publicName.trim()) return setErr("Please fill required fields.");

    setSubmitting(true);
    setSuccess(null);
    setErr(null);

    try {
      const payload = { sellerId, buyerId, productId, orderId, rating, productQuality, deliveryRating: delivery, sellerComm: communication, title, publicName, comment: comment?.trim() || "" };
      const res = await fetch(`${API_BASE}/api/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post review");

      setSuccess("Review submitted successfully!");
      setTitle(""); setPublicName(""); setComment(""); setRating(5); setProductQuality(5); setDelivery(5); setCommunication(5);
      setShowModal(false);
      fetchReviews();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="review-section">
      {/* <div className="review-header">
        <h3>Seller Reviews</h3>
        <button
          onClick={() => setShowModal(true)}
          disabled={!canWrite}
          className="write-review-btn"
          title={!buyerId ? "Login to write a review" : disabled ? "Sellers cannot review their own product" : ""}
        >
          Write a review
        </button>
      </div> */}
      <div className="review-header">
  <h3>Seller Reviews</h3>

  {!showModal && (
    <button
      onClick={() => setShowModal(true)}
      disabled={!canWrite}
      className="write-review-btn"
      title={
        !buyerId
          ? "Login to write a review"
          : disabled
          ? "Sellers cannot review their own product"
          : ""
      }
    >
      Write a review
    </button>
  )}
  {!hasPurchased && (
  <p style={{ color: "gray", marginBottom: "10px" }}>
    You must purchase this product before leaving a review.
  </p>
)}

</div>

      {showModal && (
  <div className="inline-review-form">
    <h4>Write a Review</h4>

    <form onSubmit={handleSubmit} className="review-form">

      <label>
        Title your review <span style={{ color: "red" }}>*</span>
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="E.g. Smooth experience"
        required
      />

      <label>
        What’s your public name? <span style={{ color: "red" }}>*</span>
      </label>
      <input
        type="text"
        value={publicName}
        onChange={(e) => setPublicName(e.target.value)}
        placeholder="E.g. Tan"
        required
      />

      <label>Overall Rating</label>
      <StarInput value={rating} onChange={setRating} />

      <label>Product Quality</label>
      <StarInput value={productQuality} onChange={setProductQuality} />

      <label>Delivery Experience</label>
      <StarInput value={delivery} onChange={setDelivery} />

      <label>Seller Communication</label>
      <StarInput value={communication} onChange={setCommunication} />

      <label>Comments (optional)</label>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="E.g. Quick shipping, well packed..."
      />

      {err && <p className="error-msg">{err}</p>}
      {success && <p className="success-msg">{success}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={() => setShowModal(false)}
        >
          Cancel
        </button>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  </div>
)}


      {loading && <p>Loading reviews...</p>}
      {err && <p className="error-msg">{err}</p>}
      {!loading && !err && reviews.length === 0 && <p>No reviews yet.</p>}

      {reviews.length > 0 && (
        <div className="reviews-container">
          <h4>Top reviews from buyers</h4>
          {reviews.map((r) => {
            const dt = r.createdAt && new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
            return (
              <div key={r._id} className="review-card">
                <div className="review-header-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.publicName || "Anonymous"}</div>
                  </div>
                </div>

                <div className="review-stars-title">
                  <StarRating value={r.rating} />
                  <strong>{r.title || "Untitled review"}</strong>
                </div>

                

                <SubRatingRow label="Product quality" value={r.productQuality} />
                <SubRatingRow label="Delivery" value={r.deliveryRating} />
                <SubRatingRow label="Communication" value={r.sellerComm} />
                <div className="review-meta">
                  Reviewed on {dt || "Unknown date"} {r.verifiedPurchase && <span style={{ color: "#b26a00", fontWeight: 600 }}>· Verified Purchase</span>}
                </div>

                {r.comment && cleanLegacyComment(r.comment) && (
                  <p className="review-comment">{cleanLegacyComment(r.comment)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Write a Review</h3>
            <form onSubmit={handleSubmit} className="review-form">
              <label>Title your review <span style={{ color: "red" }}>*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Smooth experience" required />

              <label>What’s your public name? <span style={{ color: "red" }}>*</span></label>
              <input type="text" value={publicName} onChange={(e) => setPublicName(e.target.value)} placeholder="E.g. Tan" required />

              <label>Overall Rating</label>
              <StarInput value={rating} onChange={setRating} />

              <label>Product Quality</label>
              <StarInput value={productQuality} onChange={setProductQuality} />

              <label>Delivery Experience</label>
              <StarInput value={delivery} onChange={setDelivery} />

              <label>Seller Communication</label>
              <StarInput value={communication} onChange={setCommunication} />

              <label>Comments (optional)</label>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="E.g. Quick shipping, well packed..." />

              {err && <p className="error-msg">{err}</p>}
              {success && <p className="success-msg">{success}</p>}

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )} */}
    </section>
  );
}

import React, { useState, useEffect } from "react";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

// small helper maps for natural language
const productQualityText = { 1: "very poor", 2: "poor", 3: "okay", 4: "good", 5: "excellent" };
const deliveryText       = { 1: "very bad",  2: "bad",  3: "okay", 4: "good", 5: "excellent" };
const sellerCommText     = { 1: "very unresponsive", 2: "unhelpful", 3: "okay", 4: "helpful", 5: "very helpful and responsive" };

export default function ReviewModal({
  isOpen,
  onClose,
  sellerId,
  buyerId,
  productId,
  orderId,
  onSubmitted,        // (createdReview) => void
}) {
  const [rating, setRating] = useState(5);
  const [productQuality, setProductQuality] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [sellerComm, setSellerComm] = useState(5);

  const [comment, setComment] = useState("");
  const [deliveryTimeDays, setDeliveryTimeDays] = useState(""); // optional
  const [wasDelayed, setWasDelayed] = useState(false);
  const [refundRequested, setRefundRequested] = useState(false);
  const [refundApproved, setRefundApproved] = useState(false);
  const [disputeRaised, setDisputeRaised] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    // reset state every time the modal opens
    setRating(5);
    setProductQuality(5);
    setDeliveryRating(5);
    setSellerComm(5);
    setComment("");
    setDeliveryTimeDays("");
    setWasDelayed(false);
    setRefundRequested(false);
    setRefundApproved(false);
    setDisputeRaised(false);
    setSubmitting(false);
    setError(null);
    setOkMsg(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const autoSummary = () => {
    const pq = productQualityText[productQuality] || "okay";
    const del = deliveryText[deliveryRating] || "okay";
    const comm = sellerCommText[sellerComm] || "okay";
    let s1 = `Product quality was ${pq}, delivery was ${del} and the seller was ${comm}.`;
    let s2 = ` Overall, I would rate this purchase ${rating} out of 5.`;
    return s1 + s2;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!sellerId || !buyerId || !productId || !orderId) {
      setError("Missing seller/buyer/product/order info.");
      return;
    }

    // final comment -> natural + user text
    const finalComment = comment
      ? `${autoSummary()} Buyer comment: "${comment}"`
      : autoSummary();

    const payload = {
      sellerId,
      buyerId,
      productId,
      orderId,
      rating,
      comment: finalComment,
      deliveryTimeDays: deliveryTimeDays ? Number(deliveryTimeDays) : undefined,
      wasDelayed,
      refundRequested,
      refundApproved,
      disputeRaised,
    };

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError("You’ve already submitted a review for this order.");
        } else {
          setError(data?.error || "Failed to submit review.");
        }
        return;
      }

      setOkMsg("Review submitted!");
      if (onSubmitted) onSubmitted(data);
      // close a moment later
      setTimeout(() => onClose?.(), 600);
    } catch (err) {
      setError("Network error while submitting review.");
    } finally {
      setSubmitting(false);
    }
  };

  const StarInput = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6 }}>
      {[1,2,3,4,5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
            color: star <= value ? "#f5a623" : "#ccc",
          }}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div style={styles.overlay} onMouseDown={(e)=>{ if (e.target===e.currentTarget) onClose?.(); }}>
      <div style={styles.modal} role="dialog" aria-modal="true">
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Write a review</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={styles.label}>Overall rating</label>
            <StarInput value={rating} onChange={setRating} />
          </div>

          <div>
            <label style={styles.label}>How was the product quality?</label>
            <StarInput value={productQuality} onChange={setProductQuality} />
            <small style={styles.muted}>{productQualityText[productQuality]}</small>
          </div>

          <div>
            <label style={styles.label}>How was the delivery experience?</label>
            <StarInput value={deliveryRating} onChange={setDeliveryRating} />
            <small style={styles.muted}>{deliveryText[deliveryRating]}</small>
          </div>

          <div>
            <label style={styles.label}>How was the seller’s communication?</label>
            <StarInput value={sellerComm} onChange={setSellerComm} />
            <small style={styles.muted}>{sellerCommText[sellerComm]}</small>
          </div>

          <div>
            <label style={styles.label}>Additional comments (optional)</label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={styles.textarea}
              placeholder="What should other customers know?"
            />
          </div>

          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Delivery time (days)</label>
              <input
                type="number"
                min="0"
                value={deliveryTimeDays}
                onChange={(e) => setDeliveryTimeDays(e.target.value)}
                style={styles.input}
                placeholder="e.g., 3"
              />
            </div>
            <div style={styles.switches}>
              <label><input type="checkbox" checked={wasDelayed} onChange={e=>setWasDelayed(e.target.checked)} /> Delayed</label>
              <label><input type="checkbox" checked={refundRequested} onChange={e=>setRefundRequested(e.target.checked)} /> Refund requested</label>
              <label><input type="checkbox" checked={refundApproved} onChange={e=>setRefundApproved(e.target.checked)} /> Refund approved</label>
              <label><input type="checkbox" checked={disputeRaised} onChange={e=>setDisputeRaised(e.target.checked)} /> Dispute raised</label>
            </div>
          </div>

          {error && <p style={{ color: "red", marginTop: 4 }}>{error}</p>}
          {okMsg && <p style={{ color: "green", marginTop: 4 }}>{okMsg}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={styles.secondary}>Cancel</button>
            <button type="submit" disabled={submitting} style={styles.primary}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
  },
  modal: {
    width: "min(680px, 94vw)", background: "#fff", borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)", padding: 16
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  closeBtn: { border: "none", background: "transparent", fontSize: 18, cursor: "pointer" },
  label: { display: "block", marginBottom: 6, fontWeight: 600 },
  textarea: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" },
  switches: { display: "grid", gap: 6, fontSize: 14, color: "#333" },
  muted: { color: "#777", fontSize: 12 },
  primary: { background: "#111", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer" },
  secondary: { background: "#f3f3f3", color: "#111", border: "1px solid #ddd", padding: "10px 16px", borderRadius: 8, cursor: "pointer" },
};

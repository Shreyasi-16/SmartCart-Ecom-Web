import React, { useState } from "react";
import axios from "axios";

export default function PaymentProofForm({ buyerId, sellerId, productId, amount, onSubmitted }) {
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId && !screenshot) {
      setMessage("Please provide a transaction ID or upload a screenshot.");
      return;
    }

    const formData = new FormData();
    formData.append("buyerId", buyerId);
    formData.append("sellerId", sellerId);
    formData.append("productId", productId);
    formData.append("transactionId", transactionId);
    formData.append("amount", amount);
    if (screenshot) formData.append("screenshot", screenshot);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/paymentProof/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Payment proof submitted successfully.");
      setTransactionId("");
      setScreenshot(null);

      // ✅ Notify parent that submission is done
      if (onSubmitted) onSubmitted();

    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit payment proof.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-3 shadow-sm border-0 mt-3">
      <h5>Submit Payment Proof</h5>

      <div className="mb-3">
        <label className="form-label">Transaction ID</label>
        <input
          type="text"
          className="form-control"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Enter UPI Transaction ID"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Upload Screenshot (optional)</label>
        <input
          type="file"
          className="form-control"
          onChange={(e) => setScreenshot(e.target.files[0])}
          accept="image/*"
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Proof"}
      </button>

      {message && <p className="text-muted mt-2">{message}</p>}
    </form>
  );
}

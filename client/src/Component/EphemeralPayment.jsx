import React, { useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";

export default function EphemeralPayment({ product, buyerId, onClose }) {
  const [upiId, setUpiId] = useState(product.sellerUpiId || "");
  const [upiLink, setUpiLink] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Step 1: Generate UPI Link
  const handleGenerate = async () => {
    try {
      const { data } = await axios.post("http://localhost:5000/api/payment/generate", {
        upiId,
        name: product.sellerName,
        amount: product.price,
        title: product.title,
      });

      setUpiLink(data.upiLink);

      // Auto-open UPI on mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = data.upiLink;
      } else {
        setShowQR(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create payment link");
    }
  };

  // 🔹 Step 2: Buyer clicks “I Paid”
const handleIPaid = async () => {
  const payload = {
    productId: product?._id || product?.id,
    buyerId: buyerId, // should come from prop
    sellerId: product?.seller?._id || product?.seller, // ✅ fixed
    amount: product?.price,
  };

  console.log("🧾 Sending payment payload:", payload);

  if (!payload.buyerId || !payload.sellerId) {
    alert("Buyer or Seller ID is missing — cannot confirm payment.");
    return;
  }

  try {
    const res = await axios.post("http://localhost:5000/api/paymentStatus/buyer-confirm", payload)


    console.log("✅ Server response:", res.data);
    setPaymentDone(true);
    
    setMessage("✅ Payment marked as done. Waiting for seller confirmation.");
    
// Close the modal after payment AND trigger parent refresh
setTimeout(() => {
  if (typeof onClose === "function") onClose(true); // pass true to indicate payment happened
}, 500);

  } catch (err) {
    console.error("❌ Payment confirm error:", err.response?.data || err.message);
    setMessage("❌ Failed to confirm payment.");
  }
};



  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 10,
        width: 320,
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <h3 style={{ marginBottom: 10 }}>{product.title}</h3>
      <p>
        <b>Price:</b> ₹{product.price}
      </p>

      <input
        type="text"
        placeholder="Seller UPI ID (e.g., ravi@okhdfcbank)"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 10,
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={handleGenerate}
        disabled={paymentDone}

        style={{
          padding: "10px 15px",
          width: "100%",
          border: "none",
          borderRadius: 8,
          backgroundColor: "#1976d2",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Generate Payment Link
      </button>

      {showQR && upiLink && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p>📱 Scan or tap to pay via UPI</p>
          <div
            style={{
              background: "white",
              padding: 16,
              display: "inline-block",
              borderRadius: 8,
            }}
          >
            <QRCode value={upiLink} size={180} />
          </div>

          {!paymentDone && (
           
              <button onClick={handleIPaid} disabled={paymentDone}

              style={{
                marginTop: 15,
                backgroundColor: "#2e7d32",
                color: "#fff",
                border: "none",
                padding: "10px 15px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ✅ I’ve Paid
            </button>
          )}

          {/* ✅ Green Alert Box after clicking “I Paid” */}
          {paymentDone && (
            <div
              style={{
                marginTop: 15,
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#d4edda",
                border: "1px solid #c3e6cb",
                color: "#155724",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              {message}
            </div>
          )}
        </div>
      )}
      {paymentDone && (
  <div
    style={{
      marginTop: 15,
      padding: 12,
      borderRadius: 8,
      backgroundColor: "#fff3cd",
      border: "1px solid #ffeeba",
      color: "#856404",
      textAlign: "center",
      fontWeight: "500",
    }}
  >
    ⏳ Waiting for seller confirmation…
  </div>
)}


      <button
        onClick={onClose}
        style={{
          marginTop: 15,
          background: "transparent",
          border: "none",
          color: "#555",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Close
      </button>
    </div>
  );
}

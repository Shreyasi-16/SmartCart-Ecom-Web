import React, { useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code"; // ✅ New import

export default function EphemeralPayment({ product }) {
 
  const [upiLink, setUpiLink] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [upiId, setUpiId] = useState(product.sellerUpiId || "");


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

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 20,
        borderRadius: 10,
        width: 300,
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
        placeholder="Enter Seller UPI ID (e.g., ravi@okhdfcbank)"
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
          <p>Scan to Pay</p>
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
        </div>
      )}
    </div>
  );
}

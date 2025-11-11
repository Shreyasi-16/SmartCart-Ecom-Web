import React, { useEffect, useState } from "react";
import axios from "axios";

export default function SellerPaymentDashboard({ sellerId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/paymentProof/seller/${sellerId}`);
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (proofId, verified) => {
    try {
      await axios.post("http://localhost:5000/api/paymentProof/verify", {
        proofId,
        verified,
      });
      fetchPayments();
    } catch (err) {
      alert("Failed to update payment status");
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [sellerId]);

  if (loading) return <p>Loading payments...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h3>💳 Payment Verification Dashboard</h3>
      {payments.length === 0 ? (
        <p>No payment proofs found.</p>
      ) : (
        <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Buyer</th>
              <th>Txn ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>{p.productId?.title}</td>
                <td>{p.buyerId?.name || p.buyerId?.email}</td>
                <td>{p.transactionId}</td>
                <td>₹{p.amount}</td>
                <td
                  style={{
                    color:
                      p.status === "verified"
                        ? "green"
                        : p.status === "rejected"
                        ? "red"
                        : "orange",
                  }}
                >
                  {p.status}
                </td>
                <td>
                  {p.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleVerify(p._id, true)}
                        style={{
                          background: "green",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          marginRight: "5px",
                          cursor: "pointer",
                        }}
                      >
                        ✅ Verify
                      </button>
                      <button
                        onClick={() => handleVerify(p._id, false)}
                        style={{
                          background: "red",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

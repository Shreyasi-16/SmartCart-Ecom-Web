import React, { useEffect, useState } from "react";
import axios from "axios";

export default function BuyerPaymentDashboard({ buyerId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/paymentProof/buyer/${buyerId}`);
      setPayments(data);
    } catch (err) {
      console.error("Error fetching buyer payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [buyerId]);

  if (loading) return <p>Loading payments...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h4>🧾 My Payments</h4>
      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <table className="table table-striped mt-3">
          <thead>
            <tr>
              <th>Product</th>
              <th>Seller</th>
              <th>Txn ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>{p.productId?.title || "N/A"}</td>
                <td>{p.sellerId?.name || p.sellerId?.email || "N/A"}</td>
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
                    fontWeight: "bold",
                  }}
                >
                  {p.status}
                </td>
                <td>{new Date(p.submittedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

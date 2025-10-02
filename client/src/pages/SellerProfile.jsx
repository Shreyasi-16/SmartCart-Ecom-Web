import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setError(null);

    fetch(`http://localhost:5000/api/users/mongo/${encodeURIComponent(sellerId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch seller (${res.status})`);
        return res.json();
      })
      .then((data) => {
        // adjust if your backend wraps the user: { data: user }
        const sellerDoc = data.data ?? data;
        setSeller(sellerDoc);
      })
      .catch((err) => {
        console.error("Error fetching seller:", err);
        setError(err.message || "Failed to load seller");
      })
      .finally(() => setLoading(false));
  }, [sellerId]);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <Link to="/" style={{ display: "inline-block", marginBottom: 12 }}>
        ← Back to home
      </Link>

      {loading ? (
        <p>Loading seller profile...</p>
      ) : error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : !seller ? (
        <p>Seller not found.</p>
      ) : (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ minWidth: 160 }}>
            <img
              src={seller.avatar ?? seller.profilePhoto ?? "/defaultAvatar.png"}
              alt={seller.name ?? seller.username ?? "Seller"}
              style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover" }}
              onError={(e) => (e.target.src = "/defaultAvatar.png")}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ marginTop: 0 }}>{seller.name ?? seller.username ?? "Unnamed seller"}</h1>

            {(seller.aboutMe) && (
              <>
                <h3>About</h3>
                <p>{seller.aboutMe}</p>
              </>
            )}

            <div style={{ marginTop: 12 }}>
              {seller.email && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Email:</strong> {seller.email}
                </p>
              )}
              {seller.phone && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Phone:</strong> {seller.phone}
                </p>
              )}
            </div>

           
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;

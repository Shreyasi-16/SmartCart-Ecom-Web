import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./SellerProfile.css";

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace the initial avatarSrc state
const [avatarSrc, setAvatarSrc] = useState("/defaultProfile.png");

// 🔥 trust score state
  const [sellerTrust, setSellerTrust] = useState(null);
  const [trustError, setTrustError] = useState(null);

    // helper to render stars for trustStars (like 4.5, 3, etc.)
  const renderStars = (trustStars) => {
    if (trustStars == null) return null;
    const full = Math.floor(trustStars);
    const half = trustStars % 1 !== 0;
    const empty = 5 - full - (half ? 1 : 0);

    return (
      <>
        {"★".repeat(full)}
        {half && "☆"}
        {"☆".repeat(empty)}
      </>
    );
  };

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
        const sellerDoc = data.data ?? data;
        setSeller(sellerDoc);
        // Set avatar once fetched
         // Use seller avatar if exists, else defaultProfile.png
         setAvatarSrc(sellerDoc.avatar || sellerDoc.profilePhoto || "/defaultProfile.png");
      })
      .catch((err) => {
        console.error("Error fetching seller:", err);
        setError(err.message || "Failed to load seller");
      })
      .finally(() => setLoading(false));
  }, [sellerId]);

    // fetch seller trust score
    useEffect(() => {
      if (!sellerId) return;
  
      setTrustError(null);
  
      fetch(
        `http://localhost:5000/api/sellers/${encodeURIComponent(
          sellerId
        )}/trust`
      )
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch seller trust");
          return res.json();
        })
        .then((data) => setSellerTrust(data))
        .catch((err) => {
          console.error("Error fetching seller trust:", err);
          setTrustError(err.message || "Failed to load trust score");
        });
    }, [sellerId]);

  const handleImageError = () => {
    // fallback to defaultProfile.png on error
  if (avatarSrc !== "/defaultProfile.png") {
    setAvatarSrc("/defaultProfile.png");
  }
  };

  return (
    <div className="seller-profile-container">
      <Link to="/" className="seller-profile-back">
        ← Back to home
      </Link>

      {loading ? (
        <p className="seller-profile-message">Loading seller profile...</p>
      ) : error ? (
        <p className="seller-profile-error">Error: {error}</p>
      ) : !seller ? (
        <p className="seller-profile-message">Seller not found.</p>
      ) : (
        <div className="seller-profile-main">
          <div className="seller-profile-avatar-wrapper">
            <img
              src={avatarSrc}
              alt={seller.name ?? seller.username ?? "Seller"}
              className="seller-profile-avatar"
              onError={handleImageError}
            />
          </div>

          <div className="seller-profile-info">
            <h1>{seller.name ?? seller.username ?? "Unnamed seller"}</h1>

            {seller.aboutMe && (
              <>
                <h3>About</h3>
                <p>{seller.aboutMe}</p>
              </>
            )}

            <div className="seller-profile-contact">
              {seller.email && (
                <p>
                  <strong>Email:</strong> {seller.email}
                </p>
              )}
              {seller.phone && (
                <p>
                  <strong>Phone:</strong> {seller.phone}
                </p>
              )}
            </div>
             {/* 🔥 Trust score section */}
            <div className="seller-profile-trust" style={{ marginTop: "12px" }}>
              {sellerTrust && sellerTrust.trustScore != null && (
                <>
                  <p style={{ margin: 0 }}>
                    <strong>Trust score:</strong>{" "}
                    {sellerTrust.trustScore}/100{" "}
                    <span style={{ color: "#f5a623", marginLeft: "6px" }}>
                      {renderStars(sellerTrust.trustStars)} (
                      {sellerTrust.trustStars.toFixed(1)}★)
                    </span>
                  </p>

                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "13px",
                      color: "#666",
                    }}
                  >
                    {sellerTrust.stats.totalReviews} reviews ·{" "}
                    {Math.round(
                      sellerTrust.stats.fraudReviewRate * 100
                    )}
                    % fraud complaints
                  </p>

                  {/* ✅ Friendly badge text instead of High/Medium/Low risk */}
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "13px",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontWeight: 600,
                        backgroundColor:
                          sellerTrust.riskLevel === "LOW"
                            ? "#e5f7ff"
                            : sellerTrust.riskLevel === "MEDIUM"
                            ? "#eafbe5"
                            : "#fff7e0",
                        color:
                          sellerTrust.riskLevel === "LOW"
                            ? "#0066b3"
                            : sellerTrust.riskLevel === "MEDIUM"
                            ? "#1b6b2a"
                            : "#b36b00",
                      }}
                    >
                      {sellerTrust.riskLevel === "LOW" &&
                        "SmartCart's Choice"}
                      {sellerTrust.riskLevel === "MEDIUM" &&
                        "Trusted Seller"}
                      {sellerTrust.riskLevel === "HIGH" &&
                        "Review feedback recommended"}
                    </span>
                  </p>

                  {/* only show reasons for the "review feedback recommended" case */}
                  {sellerTrust.riskLevel === "HIGH" &&
                    sellerTrust.reasons &&
                    sellerTrust.reasons.length > 0 && (
                      <ul
                        style={{
                          margin: "4px 0 0",
                          paddingLeft: "16px",
                          fontSize: "12px",
                          color: "#666",
                        }}
                      >
                        {sellerTrust.reasons.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    )}
                </>
              )}

              {sellerTrust && sellerTrust.trustScore == null && (
                <p
                  style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#666",
                  }}
                >
                  No reviews yet – trust score will appear once buyers leave
                  feedback.
                </p>
              )}

              {trustError && (
                <p
                  style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "red",
                  }}
                >
                  {trustError}
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

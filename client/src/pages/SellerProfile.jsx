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
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;

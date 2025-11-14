import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatBox from "../Component/ChatBox";
import { Link } from "react-router-dom";
import SmartPricingAdvisor from "../Component/SmartPricingAdvisor"; // add this import
import "./ProductPage.css";
import "@google/model-viewer"; // ✅ NEW — for 3D model rendering
import EphemeralPayment from "../Component/EphemeralPayment"; // 💳 UPI Payment Modal
import SimilarProducts from "../Component/SimilarProducts";
import ComparisonTable from "../Component/ComparisonTable";
import ViewVerificationData from "../Component/ViewVerificationData"; //verification status
import { logEvent } from "../utils/logEvent";
import { FaShoppingCart, FaHeart } from "react-icons/fa";
import SellerAISummary from "../Component/SellerAISummary";
import ReviewSection from "../Component/ReviewSection";
const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

const ProductPage = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);

  const [locationError, setLocationError] = useState(null);

  const [chatId, setChatId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  //view verification component
  const [showVerification, setShowVerification] = useState(false);

  const [sellerTrust, setSellerTrust] = useState(null);
  const [sellerTrustError, setSellerTrustError] = useState(null);


  const [hasPurchased, setHasPurchased] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
const [soldOut, setSoldOut] = useState(false);
const [buyerWaiting, setBuyerWaiting] = useState(false);


  // ✅ NEW — to auto-refresh product until 3D model is ready
  const pollRef = useRef(null);

  // const fetchProduct = async () => {
  //   try {
  //     const res = await fetch(`http://localhost:5000/products/${productId}`);
  //     if (!res.ok) throw new Error("Failed to fetch product details");
  //     const data = await res.json();
  //     setProduct(data.data ?? data);
  //   } catch (err) {
  //     console.error("Error fetching product details:", err);
  //     setError(err.message);
  //  }
  // };

  const [productLocation, setProductLocation] = useState(null);

  const fetchProduct = async () => {
    if (!productId) return;

    try {
      const res = await fetch(`http://localhost:5000/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product details");

      const json = await res.json();
      const prod = json.data ?? json;
      setProduct(prod);

      // ✅ NEW — Extract product location here
      if (prod.city || prod.location || prod.attributes?.City) {
        setProductLocation({
          city: prod.city || prod.attributes?.City || "Unknown",
          state: prod.state || prod.attributes?.State || "",
          country: prod.country || "India",
        });
      }

      // ✅ Set main photo if available
      if (typeof setMainPhoto === "function") {
        setMainPhoto(prod?.photos?.[0]?.url ?? null);
      }

      // ✅ Log product view event (if user is logged in)
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userRes = await fetch(
            `http://localhost:5000/api/users/getId/${currentUser.uid}`
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            const mongoIdLocal = userData._id || userData?.data?._id;

            if (mongoIdLocal && prod?._id) {
              await logEvent({
                userId: mongoIdLocal,
                productId: prod._id,
                eventType: "view",
              });
            }
          } else {
            console.warn(
              "Failed to fetch Mongo user ID:",
              userRes.statusText || userRes.status
            );
          }
        }
      } catch (logErr) {
        console.warn("⚠ Failed to log view event:", logErr.message);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError(err.message);
    }
  };

  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();

  // New: seller state
  const [seller, setSeller] = useState(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState(null);

  // Hooks at top level
  const [isInCart, setIsInCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Track Firebase login
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  // 📍 Fetch user location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        setUserLocation({
          city: data.city,
          region: data.region,
          country: data.country_name,
          latitude: data.latitude,
          longitude: data.longitude,
          ip: data.ip,
        });

        console.log("📍 User Location:", data);
      } catch (err) {
        console.error("Failed to fetch location:", err);
        setLocationError("Unable to detect location");
      }
    };

    fetchLocation();
  }, []);

  // Fetch Mongo userId if logged in
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    fetch(`http://localhost:5000/api/users/getId/${firebaseUser.uid}`)
      .then((res) => res.json())
      .then((data) => {
        const id = data._id || data?.data?._id;
        setMongoId(id);
      })
      .catch((err) => console.error("Error fetching Mongo user:", err));
  }, [firebaseUser]);

  // Fetch product on load
useEffect(() => {
  fetchProduct();
  return () => clearInterval(pollRef.current);
}, [productId]);

// Refresh payment status when user or product is ready
useEffect(() => {
  refreshPaymentStatus();
}, [mongoId, product?._id]);


  // canonical seller id used everywhere
  const sellerMongoId =
    seller?._id ?? product?.sellerId ?? product?.seller ?? null;

  // trust
  useEffect(() => {
    if (!sellerMongoId) return;
    setSellerTrustError(null);
    fetch(`${API_BASE}/api/sellers/${sellerMongoId}/trust`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch seller trust");
        return r.json();
      })
      .then((d) => setSellerTrust(d))
      .catch((e) => {
        console.error("trust error:", e);
        setSellerTrustError(e.message);
      });
  }, [sellerMongoId]);

  const refreshPaymentStatus = async () => {
  if (!product?._id) return;

  const res = await fetch("http://localhost:5000/api/paymentStatus/status",{

    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerId: mongoId,
      productId: product._id,
    }),
  });

  const data = await res.json();

  setPaymentStatus(data.paymentStatus);
  setSoldOut(data.soldOut);
  setBuyerWaiting(data.paymentStatus === "buyer_confirmed");
};


  // ✅ NEW — auto-refresh when model is processing
  useEffect(() => {
    clearInterval(pollRef.current);
    if (product?.modelStatus === "processing") {
      pollRef.current = setInterval(fetchProduct, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [product?.modelStatus]);

  //seller info
  // Fetch seller info once product is loaded
  useEffect(() => {
    // If product not ready, or seller already an object, return/handle accordingly
    if (!product) return;

    // If seller is already an object (API already populated it), use it
    if (product.seller && typeof product.seller === "object") {
      setSeller(product.seller);
      return;
    }

    // Otherwise product.seller should be an id (Mongo id)
    const sellerId = product.seller;
    if (!sellerId) {
      setSellerError("No seller id available for this product.");
      return;
    }

    setSellerLoading(true);
    setSellerError(null);

    // <-- adjust this endpoint to match your backend for fetching a user by id -->
    fetch(`http://localhost:5000/api/users/mongo/${sellerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch seller data");
        return res.json();
      })
      .then((data) => {
        // adapt depending on API shape
        const sellerData = data.data ?? data;
        setSeller(sellerData);
      })
      .catch((err) => {
        console.error("Error fetching seller:", err);
        setSellerError(err.message);
      })
      .finally(() => setSellerLoading(false));
  }, [product]);

  useEffect(() => {
  if (!mongoId || !product?._id) return;

  fetch(`http://localhost:5000/api/paymentStatus/hasPurchased`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerId: mongoId,
      productId: product._id
    })
  })
    .then((res) => res.json())
    .then((data) => {
      setHasPurchased(data.hasPurchased);
    })
    .catch((err) => console.error("Error checking purchase:", err));
}, [mongoId, product?._id]);


  // Fetch similar products once main product is loaded
  useEffect(() => {
    if (!productId) return;
    setSimilarProducts([]); // clear previous data to avoid flashing old ones

    fetch(`http://127.0.0.1:8000/products/similar/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("🔍 Similar API Response:", data);
        setSimilarProducts(data.data || []);
      })
      .catch((err) => {
        console.error("Error fetching similar products:", err);
      });
  }, [productId]);
  const tempOrderId = product && mongoId ? `${product._id}_${mongoId}` : null;

  // ✅ Fetch existing cart data and check if this product is in the cart
  useEffect(() => {
    if (!mongoId || !product?._id) return;

    fetch(`http://localhost:5000/api/cart/${mongoId}`)
      .then((res) => res.json())
      .then((data) => {
        const cart = Array.isArray(data) ? data : data.cart || [];
        const exists = cart.some(
          (item) =>
            item.product?._id === product._id ||
            item.productId === product._id ||
            item.productId?._id === product._id
        );
        setIsInCart(exists);
      })
      .catch((err) => console.error("Error checking cart:", err));
  }, [mongoId, product?._id]);

  // ✅ Fetch existing wishlist data and check if this product is in wishlist
  useEffect(() => {
    if (!mongoId || !product?._id) return;

    fetch(`http://localhost:5000/api/wishlist/${mongoId}`)
      .then((res) => res.json())
      .then((data) => {
        const wishlist = Array.isArray(data) ? data : data.wishlist || [];
        const exists = wishlist.some(
          (item) =>
            item.productId?._id === product._id ||
            item.productId === product._id
        );
        setIsInWishlist(exists);
      })
      .catch((err) => console.error("Error checking wishlist:", err));
  }, [mongoId, product?._id]);

  const [mainPhoto, setMainPhoto] = useState(product?.photos?.[0]?.url);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Slideshow effect
  useEffect(() => {
    if (!product?.photos?.length) return;
    if (paused) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % product.photos.length;
      setCurrentIndex(nextIndex);
      setMainPhoto(product.photos[nextIndex].url);
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [currentIndex, paused, product?.photos]);

  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!product) return <p>Loading...</p>;

  // Check if current user is the seller
  const isSeller = product.seller === mongoId;

  // Handle Chat button click
  const handleChat = () => {
    if (!firebaseUser) {
      const confirmLogin = window.confirm(
        "You need to log in to chat with the seller. Do you want to go to the login page?"
      );
      if (confirmLogin) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }

    if (!mongoId) return;

    // Generate chatId and initialize chat
    const newChatId = `${mongoId}_${product.seller}_${product._id}`;
    setChatId(newChatId);
    setChat({ _id: newChatId, messages: [] }); // empty chat initially
    setShowChat(true); // open ChatBox
  };

  const handleAddToCart = async () => {
    if (!firebaseUser) {
      const confirmLogin = window.confirm(
        "You need to log in to add to cart. Go to login page?"
      );
      if (confirmLogin) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }

    if (!mongoId) return;

    if (isInCart) {
      alert("Product is already in your cart!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mongoId,
          productId: product._id,
          quantity: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to cart");

      alert("Product added to cart successfully!");
      setIsInCart(true); // update state
      // ✅ Log cart event
      await logEvent({
        userId: mongoId,
        productId: product._id,
        eventType: "cart",
      });
    } catch (err) {
      alert("Error adding product to cart: " + err.message);
    }
  };

  const handleAddToWishlist = async () => {
    if (!firebaseUser) {
      const confirmLogin = window.confirm(
        "You need to log in to add to wishlist. Go to login page?"
      );
      if (confirmLogin) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }

    if (!mongoId) return;

    if (isInWishlist) {
      alert("Product is already in your wishlist!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mongoId, productId: product._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to wishlist");

      alert("Product added to wishlist successfully!");
      setIsInWishlist(true);
      // ✅ Log wishlist event
      await logEvent({
        userId: mongoId,
        productId: product._id,
        eventType: "wishlist",
      });
    } catch (err) {
      alert("Error adding to wishlist: " + err.message);
    }
  };

  return (
    <div className="productPage-container">
      <div className="product-details-container">
        {/* Row 1: Photos, Info, Seller */}
        <div className="row row-1">
          {/* Product Photos */}
          <div
            className="photo-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {product.photos?.length > 0 ? (
              <>
                <img
                  src={mainPhoto || product.photos[0].url}
                  alt={product.title}
                  className="main-photo"
                  onError={(e) => (e.target.src = "/defaultBG.jpg")}
                />

                <div className="thumbnails-container">
                  {product.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`${product.title} thumbnail ${index + 1}`}
                      className={`thumbnail-image ${
                        photo.url === mainPhoto ? "active-thumbnail" : ""
                      }`}
                      onClick={() => {
                        setMainPhoto(photo.url);
                        setCurrentIndex(index); // sync slideshow index
                      }}
                      onError={(e) => (e.target.src = "/defaultBG.jpg")}
                    />
                  ))}
                </div>
              </>
            ) : (
              <img src="/defaultBG.jpg" alt="default" className="main-photo" />
            )}
          </div>

          {/* Product Info */}
          <div className="info-card">
            <h1>{product.title}</h1>
            <p>{product.description}</p>
            <p style={{fontWeight:'bold', fontSize:'1.1rem',marginTop:'30px'}}>Price: ₹{product.price}</p>
            {/* Buyer has paid but seller not confirmed */}
{buyerWaiting && (
  <div className="alert alert-warning" style={{ marginTop: 10 }}>
    ⏳ You have paid. Waiting for seller confirmation...
  </div>
)}

{/* Seller confirmed (completed) */}
{hasPurchased && !isSeller && (
  <div className="alert alert-success" style={{ marginTop: 10 }}>
    🎉 Congratulations! You bought this product.
  </div>
)}

{/* Other users see SOLD OUT */}
{soldOut && !buyerWaiting && !hasPurchased && (
  <div className="alert alert-danger" style={{ marginTop: 10 }}>
    ❌ This product is SOLD OUT.
  </div>
)}


            {/* ✅ Show product attributes if any */}
            {product.attributes &&
              Object.keys(product.attributes).length > 0 && (
                <div
                  className="attributes-section"
                  style={{ marginTop: "15px" }}
                >
                  <h4 style={{fontWeight:'bold', fontSize:'1.3rem',marginTop:'30px'}}>Product Details</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <li key={key} style={{ marginBottom: "4px" }}>
                        <strong>{key}:</strong> {String(value)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* 📍 Product Location */}
            {productLocation && (
              <div className="location-box">
                <h4 style={{fontWeight:'bold', fontSize:'1.3rem',marginTop:'30px'}}>Product Location</h4>
                <p>
                  📌 <strong>{productLocation.city}</strong>
                  {productLocation.state && `, ${productLocation.state}`}
                  {productLocation.country && `, ${productLocation.country}`}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="product-action-buttons">
              <button
  className="btn add-to-cart"
  disabled={soldOut || hasPurchased}   // ⛔ disable if sold or purchased
  onClick={() => {
    if (!soldOut && !hasPurchased) handleAddToCart();
  }}
>
  <FaShoppingCart />

  {hasPurchased
    ? "✓ Purchased"
    : soldOut
    ? "❌ Sold Out"
    : isInCart
    ? "Added to Cart"
    : "Add to Cart"}
</button>


           {!isSeller && (
  <button
    className="btn buy-now"
    disabled={soldOut || buyerWaiting || hasPurchased}
    onClick={() => {
      if (!soldOut && !buyerWaiting && !hasPurchased)
        setShowPaymentModal(true);
    }}
  >
    {soldOut
      ? "❌ SOLD OUT"
      : buyerWaiting
      ? "⏳ Waiting for seller..."
      : hasPurchased
      ? "✔ Purchased"
      : "Buy Now"}
  </button>
)}

              <button
                className={`btn wishlist ${isInWishlist ? "active" : ""}`}
                onClick={handleAddToWishlist}
                title={isInWishlist ? "Added to Wishlist" : "Add to Wishlist"}
              >
                <FaHeart color={isInWishlist ? "red" : "gray"} />
              </button>
            </div>

            {/*product verification status*/}
            {/* Show verification only if category is not 8 */}
            {/* {product.categoryId !== 8 && product.categoryId !== "8" && (
              <div>
                <p>Product verification status:</p>
                <button
                  type="button"
                  onClick={() => setShowVerification(true)}
                  className="verify-btn"
                >
                  {product.verificationStatus}
                </button>

                <ViewVerificationData
                  isOpen={showVerification}
                  onClose={() => setShowVerification(false)}
                  product={product}
                />
              </div>
            )} */}
            {product.categoryId !== 8 && product.categoryId !== "8" && (
              <div className="verification-section">
                <h4 className="verification-title">Product Verification</h4>

                <div className="verification-content">
                  <p className="verification-status-label">
                    Current Status:
                    <span
                      className={`verification-status ${
                        product.verificationStatus === "Verified"
                          ? "verified"
                          : product.verificationStatus === "Pending"
                          ? "pending"
                          : "rejected"
                      }`}
                    >
                      {product.verificationStatus}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowVerification(true)}
                    className="verify-btn"
                  >
                    View Details
                  </button>
                </div>

                <ViewVerificationData
                  isOpen={showVerification}
                  onClose={() => setShowVerification(false)}
                  product={product}
                />
              </div>
            )}

            {/* ✅ 3D Model Viewer Section */}
            {product.modelStatus === "none" && (
              <p>No 3D model uploaded for this product.</p>
            )}

            {product.modelStatus === "processing" && (
              <p>
                3D model is being generated... Progress:{" "}
                {product.lastProgress ?? 0}%
              </p>
            )}

            {product.modelStatus === "failed" && (
              <p style={{ color: "red" }}>Model generation failed.</p>
            )}

            {product.modelStatus === "ready" && product.modelFileId && (
              <div style={{ marginTop: "20px" }}>
                <model-viewer
                  src={`http://localhost:5000/api/models/${product.modelFileId}`}
                  alt={`${product.title} 3D model`}
                  camera-controls
                  auto-rotate
                  ar
                  style={{
                    width: "100%",
                    height: "500px",
                    background: "#fff",
                    borderRadius: "8px",
                  }}
                />
                {/* <div style={{ marginTop: "10px" }}>
                  <a
                    href={`http://localhost:5000/api/models/${product.modelFileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    Download 3D Model (.glb)
                  </a>
                </div> */}
              </div>
            )}

            {/* Seller Info */}
            {/* <div className="seller-card-wrapper">
              <section className="seller-section">
                <h2>Seller</h2>
                {sellerLoading && <p>Loading seller info...</p>}
                {sellerError && (
                  <p style={{ color: "red" }}>Seller error: {sellerError}</p>
                )}
                {!sellerLoading && !seller && !sellerError && (
                  <p>Seller info not available.</p>
                )}
                {seller && (
                  <div className="seller-card">
                    {seller.avatar && (
                      <img
                        src={seller.avatar}
                        alt={`${seller.name || "Seller"} avatar`}
                        className="seller-avatar"
                        onError={(e) => (e.target.src = "/defaultAvatar.png")}
                      />
                    )}
                    <div>
                      <p style={{ margin: 0 }}>
                        <strong>
                          <Link
                            to={`/seller/${seller._id ?? seller.id}`}
                            style={{ textDecoration: "none", color: "#111" }}
                          >
                            {seller.name ?? seller.username ?? "Unnamed seller"}
                          </Link>
                        </strong>
                      </p>
                      {seller.email && <p>Email: {seller.email}</p>}
                      {seller.phone && <p>Phone: {seller.phone}</p>}
                      {sellerTrust && sellerTrust.trustScore != null && (
                        <div style={{ marginTop: 4, fontSize: 14 }}>
                          <strong>Trust score:</strong> {sellerTrust.trustScore}
                          /100{" "}
                          <span style={{ color: "#f5a623" }}>
                            {sellerTrust.trustStars} ★
                          </span>
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
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
                                marginRight: 8,
                              }}
                            >
                              {sellerTrust.riskLevel === "LOW" &&
                                "SmartCart's Choice"}
                              {sellerTrust.riskLevel === "MEDIUM" &&
                                "Trusted Seller"}
                              {sellerTrust.riskLevel === "HIGH" &&
                                "Review feedback recommended"}
                            </span>
                            {sellerTrust.stats.totalReviews} reviews ·{" "}
                            {Math.round(
                              sellerTrust.stats.fraudReviewRate * 100
                            )}
                            % fraud complaints
                          </div>
                        </div>
                      )}
                      {sellerTrustError && (
                        <div
                          style={{ fontSize: 12, color: "red", marginTop: 4 }}
                        >
                          {sellerTrustError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div> */}

            {/* {!isSeller && (
              <button
                className="chat-button"
                onClick={handleChat}
                disabled={!mongoId}
              >
                {!mongoId ? "Loading...USer not log in" : "Chat"}
              </button>
            )} */}
          </div>
        </div>

        {/* Row 2: Price Advisor + Seller Info */}
        <div className="row row-2">
          {/* Column 1: Price Advisor */}
          <div className="col price-advisor-column" style={{ flex: 1 }}>
            <SmartPricingAdvisor product={product} />
          </div>

          {/* Column 2: Seller Info */}
          <div className="col seller-info-column" style={{ flex: 1 }}>
            <section className="seller-section">
              <h2>Seller</h2>
              {sellerLoading && <p>Loading seller info...</p>}
              {sellerError && (
                <p style={{ color: "red" }}>Seller error: {sellerError}</p>
              )}
              {!sellerLoading && !seller && !sellerError && (
                <p>Seller info not available.</p>
              )}
              {seller && (
                <div className="seller-card">
                  {seller.avatar && (
                    <img
                      src={seller.avatar}
                      alt={`${seller.name || "Seller"} avatar`}
                      className="seller-avatar"
                      onError={(e) => (e.target.src = "/defaultAvatar.png")}
                    />
                  )}
                  <div>
                    <p style={{ margin: 0 }}>
                      <strong>
                        <Link
                          to={`/seller/${seller._id ?? seller.id}`}
                          style={{ textDecoration: "none", color: "#111" }}
                        >
                          {seller.name ?? seller.username ?? "Unnamed seller"}
                        </Link>
                      </strong>
                    </p>
                    {seller.email && <p>Email: {seller.email}</p>}
                    {seller.phone && <p>Phone: {seller.phone}</p>}
                    {sellerTrust && sellerTrust.trustScore != null && (
                      <div style={{ marginTop: 4, fontSize: 14 }}>
                        <strong>Trust score:</strong> {sellerTrust.trustScore}
                        /100{" "}
                        <span style={{ color: "#f5a623" }}>
                          {sellerTrust.trustStars} ★
                        </span>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
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
                              marginRight: 8,
                            }}
                          >
                            {sellerTrust.riskLevel === "LOW" &&
                              "SmartCart's Choice"}
                            {sellerTrust.riskLevel === "MEDIUM" &&
                              "Trusted Seller"}
                            {sellerTrust.riskLevel === "HIGH" &&
                              "Review feedback recommended"}
                          </span>
                          {sellerTrust.stats.totalReviews} reviews ·{" "}
                          {Math.round(sellerTrust.stats.fraudReviewRate * 100)}%
                          fraud complaints
                        </div>
                      </div>
                    )}
                    {sellerTrustError && (
                      <div style={{ fontSize: 12, color: "red", marginTop: 4 }}>
                        {sellerTrustError}
                      </div>
                    )}
                    {!isSeller && (
                      <button
                        className="chat-button"
                        onClick={handleChat}
                        disabled={!mongoId}
                      >
                        {!mongoId ? "Loading...USer not log in" : "Chat"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* AI Summary + Reviews (raised z-index to ensure clicks land) */}
        {/* <div className="seller-review-section">
          <div className="section-card">
            <SellerAISummary sellerId={sellerMongoId} />
          </div>

          <div className="section-card">
            <ReviewSection
              sellerId={sellerMongoId}
              buyerId={mongoId}
              productId={product._id}
              orderId={tempOrderId}
              disabled={isSeller}
            />
          </div>
        </div> */}
        <div className="seller-review-section row row-3">
          <div className="section-card">
            <SellerAISummary sellerId={sellerMongoId} />
          </div>

          <div className="section-card">
           <ReviewSection
  sellerId={sellerMongoId}
  buyerId={mongoId}
  productId={product._id}
  orderId={tempOrderId}
  disabled={!hasPurchased || isSeller} 
  hasPurchased={hasPurchased}
/>

          </div>
        </div>

        {!isSeller && showChat && chat && chatId && (
          <ChatBox
            chatId={chatId}
            product={product}
            sellerId={sellerMongoId}
            buyerId={mongoId}
            currentUserId={mongoId}
            onClose={() => setShowChat(false)}
          />
        )}
        <div className="similar-products">
          <SimilarProducts products={similarProducts} />

          {similarProducts && similarProducts.length === 0 && (
            <p>No similar products found.</p>
          )}

          {similarProducts && similarProducts.length > 0 && (
            <div className="similar-products-grid">
              {similarProducts.map((p) => (
                <div key={p._id} className="similar-product-card">
                  <img
                    src={p.photos?.[0]?.url || "/defaultBG.jpg"}
                    alt={p.title}
                    className="similar-product-image"
                  />
                  <p>{p.title}</p>
                  <p>₹{p.price}</p>
                  {/* Buyer has paid but seller not confirmed */}




                  <Link to={`/product/${p._id}`} className="view-btn">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
        <section className="comparison-section ">
          <ComparisonTable key={product._id} productId={product._id} />
        </section>

        {/* Seller notice */}
        {isSeller && (
          <p className="text-danger mt-3">
            You are the seller. You cannot chat.
          </p>
        )}

        {/* ChatBox */}
        {!isSeller && showChat && chat && chatId && (
          <ChatBox
            chatId={chatId}
            product={product}
            sellerId={product.seller}
            buyerId={mongoId}
            currentUserId={mongoId}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
      {/* {showPaymentModal && (
  <EphemeralPayment
    product={{
      ...product,
      sellerName: seller?.name || "Seller",
      sellerUpiId: seller?.upiId || "",
      seller: seller?._id || product?.seller, // ✅ ensures sellerId is always present
    }}
    buyerId={mongoId} // ✅ pass logged-in buyer’s Mongo ID
    onClose={() => setShowPaymentModal(false)}
  />
)} */}

      {showPaymentModal && (
        <div
          className="payment-overlay"
          onClick={() => setShowPaymentModal(false)}
        >
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="payment-modal-close"
              onClick={() => setShowPaymentModal(false)}
            >
              ✕
            </button>

            <EphemeralPayment
              product={{
                ...product,
                sellerName: seller?.name || "Seller",
                sellerUpiId: seller?.upiId || "",
                seller: seller?._id || product?.seller,
              }}
              buyerId={mongoId}
             onClose={(paid) => {
  setShowPaymentModal(false);
  if (paid) refreshPaymentStatus();  // 🔥 refresh state when buyer clicks “I Paid”
}}

            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;

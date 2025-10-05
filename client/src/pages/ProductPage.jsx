import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatBox from "../Component/ChatBox";
import { Link } from "react-router-dom";
import SmartPricingAdvisor from "../Component/SmartPricingAdvisor"; // add this import
import "./ProductPage.css";

const ProductPage = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState(null);
  const [chatId, setChatId] = useState(null);

  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();

  // New: seller state
  const [seller, setSeller] = useState(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerError, setSellerError] = useState(null);

  // Track Firebase login
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return () => unsubscribe();
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

  useEffect(() => {
    fetch(`http://localhost:5000/products/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch product details");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched product:", data);
        setProduct(data.data); // ✅ unwrap
      })
      .catch((err) => {
        console.error("Error fetching product details:", err);
        setError(err.message);
      });
  }, [productId]);
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

  return (
    <div className="productPage-container">
      <div className="product-details-container">
        {/* Row 1: Photos, Info, Seller */}
        <div className="row row-1">
          {/* Product Photos */}
          <div className="photo-card"
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
            className={`thumbnail-image ${photo.url === mainPhoto ? 'active-thumbnail' : ''}`}
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
          {/* Chat button for buyers */}
      

          {/* Product Info */}
          <div className="info-card">
            <h1>{product.title}</h1>
            <p>{product.description}</p>
            <p>Price: ₹{product.price}</p>
            {product.sub_category && <p>Category: {product.sub_category}</p>}
            {product.ratings && <p>Ratings: {product.ratings}</p>}
            {/* Seller Info */}
            <div className="seller-card-wrapper">
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
                    </div>
                  </div>
                )}
              </section>
            </div>
            {!isSeller && (
            <button className="chat-btn" onClick={handleChat} disabled={!mongoId}>
              {!mongoId ? "Loading...USer not log in" : "Chat"}
            </button>
            )}
          </div>
        </div>

        {/* Row 2: Price Advisor */}
        <div className="row ">
          <SmartPricingAdvisor product={product} />
        </div>

        {/* Seller notice */}
      {isSeller && (
        <p className="text-danger mt-3">You are the seller. You cannot chat.</p>
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
    </div>
  );
};

export default ProductPage;

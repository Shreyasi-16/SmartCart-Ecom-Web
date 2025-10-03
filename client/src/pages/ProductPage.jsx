import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatBox from "../Component/ChatBox";
import { Link } from "react-router-dom";
import SmartPricingAdvisor from "../Component/SmartPricingAdvisor"; // add this import

const ProductPage = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chat, setChat] = useState(null);

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



  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!product) return <p>Loading...</p>;

  // Handle Chat button
  const handleChat = async () => {
    if (!firebaseUser) {
      const confirmLogin = window.confirm(
        "You need to log in to chat with the seller. Do you want to go to the login page?"
      );
      if (confirmLogin) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }

    // Ensure buyerId is available before attempting chat init
    if (!mongoId) {
        console.warn("Mongo buyer ID not yet available. Please wait.");
        // Could display a temporary message here
        return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/chats/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: mongoId,             
          sellerId: product.seller,     
          productId: product._id,      
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to start chat: ${res.status} - ${errorText}`);
      }
      
      const chatData = await res.json();
      console.log("Chat started/fetched:", chatData);
      
      setChat(chatData);
      setShowChat(true);

    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  return (
    <div className="product-details">
      <h1>{product.title}</h1>
        {/* ✅ Display all product photos */}
      {product.photos?.length > 0 && (
        <div className="product-images-gallery">
          {product.photos.map((photo, index) => (
            <img
              key={index}
              src={photo.url}
              alt={`${product.title} - ${index + 1}`}
              className="product-image-large"
              onError={(e) => {
                e.target.src = "/defaultBG.jpg"; // fallback
              }}
            />
          ))}
        </div>
      )}
      <p>{product.description}</p>
      <p>Price: ₹{product.price}</p>
      {/* Smart Pricing Advisor block */}
      <SmartPricingAdvisor product={product} />
      {product.ratings && <p>Ratings: {product.ratings}</p>}
      {product.sub_category && <p>Category: {product.sub_category}</p>}
       {/* SELLER SECTION */}
      <section className="seller-section" style={{ marginTop: 20 }}>
        <h2>Seller</h2>

        {sellerLoading && <p>Loading seller info...</p>}

        {sellerError && <p style={{ color: "red" }}>Seller error: {sellerError}</p>}

        {!sellerLoading && !seller && !sellerError && <p>Seller info not available.</p>}

        {seller && (
          <div className="seller-card">
            {/* adapt field names to your user schema */}
            {seller.avatar && (
              <img
                src={seller.avatar}
                alt={`${seller.name || "Seller"} avatar`}
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%" }}
                onError={(e) => (e.target.src = "/defaultAvatar.png")}
              />
            )}
            <div>
              <p style={{ margin: 0 }}>
        <strong>
          <Link to={`/seller/${seller._id ?? seller.id}`} style={{ textDecoration: "none", color: "#111" }}>
            {seller.name ?? seller.username ?? "Unnamed seller"}
          </Link>
        </strong>
      </p>
              {seller.email && <p>Email: {seller.email}</p>}
              {seller.phone && <p>Phone: {seller.phone}</p>}
              {/* optionally show seller location or rating if available */}
             
            </div>
          </div>
        )}
      </section>
      <button onClick={handleChat}>Chat</button>

      {showChat && chat && (
        <ChatBox
          chatId={chat._id} // Use chat._id from the response
          product={product}
          sellerId={product.seller}
          buyerId={mongoId}
          currentUserId={mongoId} 
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default ProductPage;
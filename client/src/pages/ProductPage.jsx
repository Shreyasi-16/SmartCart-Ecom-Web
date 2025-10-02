import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatBox from "../Component/ChatBox";

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
              src={photo}
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
       {product.ratings && <p>Ratings: {product.ratings}</p>}
      {product.sub_category && <p>Category: {product.sub_category}</p>}
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
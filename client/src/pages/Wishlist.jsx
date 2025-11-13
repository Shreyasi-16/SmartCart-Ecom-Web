import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";
import "./Wishlist.css";
import { logEvent } from "../utils/logEvent";

const Wishlist = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 🔑 Get Firebase user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  // 🧠 Get MongoDB user ID
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    fetch(`http://localhost:5000/api/users/getId/${firebaseUser.uid}`)
      .then((res) => res.json())
      .then((data) => setMongoId(data._id || data?.data?._id))
      .catch((err) => setError("Failed to get user ID: " + err.message));
  }, [firebaseUser]);

  // 💖 Fetch wishlist items
  useEffect(() => {
    if (!mongoId) return;
    setLoading(true);
    fetch(`http://localhost:5000/api/wishlist/${mongoId}`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data.wishlist)
          ? data.wishlist.filter((item) => item?.productId?._id)
          : [];
        setWishlistItems(items);
      })
      .catch((err) => setError("Failed to fetch wishlist: " + err.message))
      .finally(() => setLoading(false));
  }, [mongoId]);

  // 🛒 Fetch cart items
  useEffect(() => {
    if (!mongoId) return;
    fetch(`http://localhost:5000/api/cart/${mongoId}`)
      .then((res) => res.json())
      .then((data) => {
        const cart = Array.isArray(data) ? data : data.cart || [];
        setCartItems(cart.filter((item) => item?.productId?._id));
      })
      .catch((err) => console.error("Error loading cart:", err));
  }, [mongoId]);

  // ❌ Remove product from wishlist
  const handleRemove = async (productId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/wishlist/${mongoId}/${productId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to remove product");

      setWishlistItems((prev) =>
        prev.filter((item) => item?.productId?._id !== productId)
      );

      alert("Removed from wishlist 💔");
      await logEvent({ userId: mongoId, productId, eventType: "wishlist_remove" });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // ✅ Add to cart
  const handleAddToCart = async (p) => {
    if (!firebaseUser) {
      const confirmLogin = window.confirm(
        "You need to log in to add to cart. Go to login page?"
      );
      if (confirmLogin) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      }
      return;
    }

    if (!p?._id) {
      alert("Invalid product information");
      return;
    }

    const alreadyInCart = cartItems.some(
      (item) =>
        item?.product?._id === p._id ||
        item?.productId === p._id ||
        item?.productId?._id === p._id
    );

    if (alreadyInCart) {
      alert("Product is already in your cart!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mongoId,
          productId: p._id,
          quantity: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to cart");

      alert("Product added to cart successfully!");
      setCartItems((prev) => [...prev, { productId: p }]);
      await logEvent({ userId: mongoId, productId: p._id, eventType: "cart" });
    } catch (err) {
      alert("Error adding product to cart: " + err.message);
    }
  };

  // 🧭 Navigate to product page
  const handleViewProduct = async (productId) => {
    if (!productId) return;
    navigate(`/product/${productId}`);
    await logEvent({ userId: mongoId, productId, eventType: "view" });
  };

  // 🕓 Loading or error states
  if (loading) return <p>Loading wishlist...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!loading && wishlistItems.length === 0)
    return <p>Your wishlist is empty!</p>;

  // 🎁 Wishlist UI
  return (
    <div className="wishlist-container">
      <h1 className="wishlist-title">My Wishlist</h1>
      <p className="wishlist-tagline">
        Your favorites, all in one place 💖<br />
        Add them to your cart or buy them before they’re gone!
      </p>

      <div className="wishlist-card">
        <div className="wishlist-grid">
          {wishlistItems.map((item) => {
            const p = item?.productId || {};
            const img =
              typeof p.photos?.[0] === "string" && /^https?:\/\//i.test(p.photos[0])
                ? p.photos[0]
                : p.photos?.[0]?.url || "/defaultBG.jpg";

            return (
              <div className="wishlist-item" key={p._id || Math.random()}>
                <img
                  src={img}
                  alt={p.title || "Product"}
                  className="wishlist-img"
                  onClick={() => handleViewProduct(p._id)}
                  onError={(e) => (e.currentTarget.src = "/defaultBG.jpg")}
                />

                <FaHeart
                  className="wishlist-heart"
                  title="Remove from Wishlist"
                  onClick={() => handleRemove(p._id)}
                />

                <div className="wishlist-info">
                  <h3
                    onClick={() => handleViewProduct(p._id)}
                    style={{ cursor: "pointer" }}
                  >
                    {p.title || "Untitled Product"}
                  </h3>
                  <p>₹ {p.price ?? "N/A"}</p>

                  <div className="wishlist-buttons">
                    <button className="add-btn" onClick={() => handleAddToCart(p)}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

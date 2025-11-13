import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FaTrash } from "react-icons/fa";
import { FiShoppingBag } from "react-icons/fi";
import "./Cart.css";
import { logEvent } from "../utils/logEvent";

const Cart = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    fetch(`http://localhost:5000/api/users/getId/${firebaseUser.uid}`)
      .then((res) => res.json())
      .then((data) => setMongoId(data._id || data?.data?._id))
      .catch((err) => console.error(err));
  }, [firebaseUser]);

  useEffect(() => {
    if (!mongoId) return;
    setLoading(true);
    fetch(`http://localhost:5000/api/cart/${mongoId}`)
      .then((res) => res.json())
      .then((data) => setCartItems(data.cart || data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mongoId]);

  // 🧠 Log cart view (once when cart loads)
  useEffect(() => {
    if (mongoId && cartItems.length > 0) {
      (async () => {
        for (const item of cartItems) {
          await logEvent({
            userId: mongoId,
            productId: item.productId._id,
            eventType: "cart",
          });
        }
      })();
    }
  }, [mongoId, cartItems]);
  

  const handleRemove = async (productId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/cart/${mongoId}/${productId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove item");
      setCartItems(cartItems.filter((item) => item.productId && item.productId._id !== productId));


      // ✅ Log event: user removed an item from cart
      await logEvent({ userId: mongoId, productId, eventType: "cart_remove" });

    } catch (err) {
      alert("Error removing item: " + err.message);
    }
  };

  const handleBuyNow = async(productId) => {
    alert(`Buying product: ${productId}`);
    // ✅ Log event: user initiated purchase
    await logEvent({ userId: mongoId, productId, eventType: "purchase" });
  };

  
  if (loading) return <p className="loading-text">Loading cart...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (cartItems.length === 0)
    return <p className="empty-text">Your cart is empty!</p>;

  return (
    <div className="cart-container">
      <h1 className="cart-title">Your Cart</h1>

      <div className="cart-grid">
        <div className="cart-product-card">
          <div className="cart-header">
            <div>Product</div>
            <div>Price</div>
            <div>Buy</div>
            <div>Remove</div>
          </div>

          {cartItems
  .filter((item) => item.productId) // ✅ Skip any null or missing product entries
  .map((item) => (
    <div key={item._id} className="cart-product-item">
      <div
        className="product-info"
        onClick={() => setSelectedProduct(item.productId)}
      >
        <img
          src={item.productId?.photos?.[0]?.url || "/defaultBG.jpg"}
          alt={item.productId?.title || "Product image"}
          className="product-image"
        />
        <h3>{item.productId?.title || "Unnamed Product"}</h3>
      </div>

      <div className="price-col">
        <p>₹{item.productId?.price || "N/A"}</p>
      </div>

      <button
        className="btn buy-btn"
        onClick={() => handleBuyNow(item.productId?._id)}
      >
        Buy Now
      </button>

      <button
        className="btn remove-btn"
        onClick={() => handleRemove(item.productId?._id)}
      >
        Remove
      </button>
    </div>
  ))}

        </div>
      </div>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedProduct?.photos?.[0]?.url || "/defaultBG.jpg"}
              alt={selectedProduct?.title}
              className="modal-image"
            />
            <h2>{selectedProduct?.title}</h2>
            <p>Price: ₹{selectedProduct?.price}</p>
            {selectedProduct?.attributes && (
              <ul>
                {Object.entries(selectedProduct.attributes).map(
                  ([key, val]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {val}
                    </li>
                  )
                )}
              </ul>
            )}
            <button
              className="btn close-btn"
              onClick={() => setSelectedProduct(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

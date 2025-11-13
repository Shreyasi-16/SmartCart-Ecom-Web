import React, { useState, useEffect } from "react";
import Hero from "../Component/Hero";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useLocation } from "react-router-dom";

import {
  FaTshirt,
  FaLaptop,
  FaCouch,
  FaBook,
  FaMobileAlt,
  FaShoePrints,
  FaCar,
  FaBicycle,
  FaPaw,
  FaPalette,
} from "react-icons/fa";
import "./Home.css";

export function Home() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [mongoId, setMongoId] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { product } = location.state || {};
  const [recentlyViewed, setRecentlyViewed] = useState([]);

// useEffect(() => {
//   if (!mongoId) return;
//   const fetchRecentlyViewed = async () => {
//     try {
      
//       const res = await axios.get("http://127.0.0.1:5000/api/recommendations", {
//   params: { userId: mongoId },
//   timeout: 8000,
// });

//       setRecentlyViewed(res.data.products || []);
//     } catch (err) {
//       console.error("❌ Error fetching recently viewed:", err);
//     }
//   };
//   fetchRecentlyViewed();
// }, [mongoId]);



   // ✅ Detect logged-in user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);


  // ✅ Fetch MongoDB user ID
useEffect(() => {
  if (!userId) return;
  fetch(`http://localhost:5000/api/users/getId/${userId}`)
    .then((res) => res.json())
    .then((data) => setMongoId(data._id || data?.data?._id))
    .catch((err) => console.error("Error fetching Mongo user ID:", err));
}, [userId]);

useEffect(() => {
  console.log("Firebase UID:", userId);
}, [userId]);

useEffect(() => {
  console.log("Mongo ID:", mongoId);
}, [mongoId]);



  // ✅ Fetch recommendations from backend (cached from MongoDB)
useEffect(() => {
  if (!mongoId) return;
  const fetchRecommendations = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/recommendations", {
        params: { userId: mongoId },
      });
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error("❌ Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch instantly
  fetchRecommendations();

  // Optional: Auto-refresh every 1 minute (keeps fresh)
  const interval = setInterval(fetchRecommendations, 60000);
  return () => clearInterval(interval);
}, [mongoId]);




  const categories = [
    { name: "Women Clothing", icon: <FaTshirt size={40} />, color: "#ff6b35" },
    { name: "Laptops", icon: <FaLaptop size={40} />, color: "#1e3a8a" },
    { name: "Furniture", icon: <FaCouch size={40} />, color: "#10b981" },
    { name: "Books", icon: <FaBook size={40} />, color: "#f59e0b" },
    { name: "Mobiles", icon: <FaMobileAlt size={40} />, color: "#2563eb" },
    { name: "Women Accessories", icon: <FaShoePrints size={40} />, color: "#dc2626" },
    { name: "Cars", icon: <FaCar size={40} />, color: "#f97316" },
    { name: "Bikes", icon: <FaBicycle size={40} />, color: "#8b5cf6" },
    { name: "Pets", icon: <FaPaw size={40} />, color: "#ec4899" },
  ];

  return (
    <div>
      <Hero />

      {/* Categories Section */}
      <section className="categories">
        <h2 className="categories-title">Shop by Categories</h2>
        <div className="categories-slider">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="category-card"
              onClick={() => {
                // Navigate to Product page and pass category as state
                navigate("/product", { state: { selectedCategory: cat.name } });
              }}
            >
              <div className="category-icon" style={{ color: cat.color }}>
                {cat.icon}
              </div>
              <h3>{cat.name}</h3>
            </div>
          ))}
        </div>
      </section>

      
      {/* Recently Viewed Section */}
{/* <section className="featured-products">
  <h2 className="section-title">Recently Viewed</h2>
  <div className="products-grid">
    {recentlyViewed.length === 0 ? (
      <p>No recently viewed products yet.</p>
    ) : (
      recentlyViewed.map((product) => (
        <div
          key={product._id}
          className="product-card"
          onClick={() => navigate(`/product/${product._id}`)}
        >
          <img
            src={
              product.thumbnail ||
              product.photos?.[0]?.url ||
              "https://via.placeholder.com/200"
            }
            alt={product.title}
            className="product-image"
          />
          <h3 className="product-name">{product.title}</h3>
          <p className="product-price">₹{product.price}</p>
          <button className="btn btn-primary">Add to Cart</button>
        </div>
      ))
    )}
  </div>
</section> */}


        {/* Personalized Recommendations */}
      {/* Personalized Recommendations */}
{mongoId && (
  <section className="recommendation-section">
    <h2 className="section-title">Recommended For You</h2>
    {loading ? (
      <p>Loading personalized recommendations...</p>
    ) : recommendations.length === 0 ? (
      <p>No recommendations available yet.</p>
    ) : (
      <div className="recommendation-grid">
        {recommendations.map((product) => (
          <div 
          key={product._id} 
          className="recommend-card" 
          onClick={() => navigate(`/product/${product._id}`, { state: { product } })}
          >
            <div className="image-container">
              <img
                src={
                  product.thumbnail ||
                  product.photos?.[0]?.url ||
                  "https://via.placeholder.com/300x300?text=No+Image"
                }
                alt={product.title}
                className="recommend-image"
              />
              <div className="overlay">
                <h3 className="overlay-title">{product.title}</h3>
                <p className="overlay-price">₹{product.price}</p>
                <div className="overlay-actions">
                  <button className="overlay-btn cart-btn">
                    <i className="fas fa-shopping-cart"></i>
                  </button>
                  <button className="overlay-btn wishlist-btn">
                    <i className="fas fa-heart"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}

    </div>
  );
}

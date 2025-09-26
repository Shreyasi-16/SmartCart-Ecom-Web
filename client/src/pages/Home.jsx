import React from "react";
import Hero from "../Component/Hero";
import { useNavigate } from "react-router-dom";

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

      {/* Featured Products Section */}
      <section className="featured-products">
        <h2 className="section-title">Featured Products</h2>
        <div className="products-grid">
          {[
            { id: 1, name: "Product 1", price: "$49.99", image: "https://via.placeholder.com/200" },
            { id: 2, name: "Product 2", price: "$59.99", image: "https://via.placeholder.com/200" },
            { id: 3, name: "Product 3", price: "$39.99", image: "https://via.placeholder.com/200" },
            { id: 4, name: "Product 4", price: "$29.99", image: "https://via.placeholder.com/200" },
          ].map((product) => (
            <div key={product.id} className="product-card">
              <img src={product.image} alt={product.name} className="product-image" />
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">{product.price}</p>
              <button className="btn btn-primary">Add to Cart</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

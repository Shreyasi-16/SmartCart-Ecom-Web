import React from "react";
import Hero from "../Component/Hero";
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
  FaHome,
  FaPalette,
} from "react-icons/fa";
import "./Home.css";

export function Home() {
  const categories = [
    { name: "Fashion", icon: <FaTshirt size={40} />, color: "#ff6b35" },
    { name: "Electronics", icon: <FaLaptop size={40} />, color: "#1e3a8a" },
    { name: "Furniture", icon: <FaCouch size={40} />, color: "#10b981" },
    { name: "Decor", icon: <FaPalette size={40} />, color: "#facc15" },
    { name: "Books & Hobbies", icon: <FaBook size={40} />, color: "#f59e0b" },
    { name: "Mobiles", icon: <FaMobileAlt size={40} />, color: "#2563eb" },
    { name: "Shoes", icon: <FaShoePrints size={40} />, color: "#dc2626" },
    { name: "Cars", icon: <FaCar size={40} />, color: "#f97316" },
    { name: "Bikes", icon: <FaBicycle size={40} />, color: "#8b5cf6" },
    { name: "Pets", icon: <FaPaw size={40} />, color: "#ec4899" },
    { name: "House", icon: <FaHome size={40} />, color: "#14b8a6" },
  ];

  const featuredProducts = [
    { id: 1, name: "Stylish T-Shirt", price: "$29.99", image: "path/to/image1.jpg" },
    { id: 2, name: "Wireless Headphones", price: "$89.99", image: "path/to/image2.jpg" },
    { id: 3, name: "Modern Sofa", price: "$499.99", image: "path/to/image3.jpg" },
    { id: 4, name: "Smartphone", price: "$699.99", image: "path/to/image4.jpg" },
    // Add more products as needed
  ];

  return (
    <div>
      <Hero />

      {/* Categories Section */}
      <section className="categories">
        <h2 className="categories-title">Shop by Categories</h2>
        <div className="categories-slider">
          {categories.map((cat, index) => (
            <div key={index} className="category-card">
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
      { id: 5, name: "Product 5", price: "$69.99", image: "https://via.placeholder.com/200" },
      { id: 6, name: "Product 6", price: "$79.99", image: "https://via.placeholder.com/200" },
      { id: 7, name: "Product 7", price: "$89.99", image: "https://via.placeholder.com/200" },
      { id: 8, name: "Product 8", price: "$99.99", image: "https://via.placeholder.com/200" },
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

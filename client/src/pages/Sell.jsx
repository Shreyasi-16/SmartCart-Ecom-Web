// src/pages/Sell.jsx
import React, { useState } from "react";
import "./Sell.css";
import {
  FaCar,
  FaHome,
  FaMobileAlt,
  FaBriefcase,
  FaBicycle,
  FaTv,
  FaTruck,
  FaCouch,
  FaTshirt,
  FaBook,
  FaDog,
  FaTools,
} from "react-icons/fa";

export default function Sell() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    { icon: <FaCar />, name: "Cars" },
    { icon: <FaHome />, name: "Properties" },
    { icon: <FaMobileAlt />, name: "Mobiles" },
    { icon: <FaBriefcase />, name: "Jobs" },
    { icon: <FaBicycle />, name: "Bikes" },
    { icon: <FaTv />, name: "Electronics & Appliances" },
    { icon: <FaTruck />, name: "Commercial Vehicles & Spares" },
    { icon: <FaCouch />, name: "Furniture" },
    { icon: <FaTshirt />, name: "Fashion" },
    { icon: <FaBook />, name: "Books, Sports & Hobbies" },
    { icon: <FaDog />, name: "Pets" },
    { icon: <FaTools />, name: "Services" },
  ];

  // Simple example forms based on category
  const renderForm = () => {
  return (
    <div className="form-container">
      {/* Back Arrow */}
      <button
        className="back-arrow"
        onClick={() => setSelectedCategory(null)}
      >
        ←
      </button>

      {/* Form content */}
      {selectedCategory === "Cars" ? (
        <form className="category-form">
          <h3>Post an Ad for Cars</h3>
          <input type="text" placeholder="Brand" required />
          <input type="text" placeholder="Model" required />
          <input type="number" placeholder="Year" required />
          <input type="number" placeholder="Price" required />
          <textarea placeholder="Description" required></textarea>
          <button type="submit">Submit</button>
        </form>
      ) : selectedCategory === "Mobiles" ? (
        <form className="category-form">
          <h3>Post an Ad for Mobiles</h3>
          <input type="text" placeholder="Brand" required />
          <input type="text" placeholder="Model" required />
          <input type="number" placeholder="Price" required />
          <textarea placeholder="Description" required></textarea>
          <button type="submit">Submit</button>
        </form>
      ) : (
        <form className="category-form">
          <h3>Post an Ad for {selectedCategory}</h3>
          <input type="text" placeholder="Title" required />
          <input type="number" placeholder="Price" required />
          <textarea placeholder="Description" required></textarea>
          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
};

  return (
    <div className="sell-container">
      <h2 className="sell-title">POST YOUR AD</h2>
      <div className="sell-box">
        {!selectedCategory ? (
          <>
            <h6 className="category-heading">CHOOSE A CATEGORY</h6>
            <ul className="category-list">
              {categories.map((cat, index) => (
                <li
                  key={index}
                  className="category-item"
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-name">{cat.name}</span>
                  <span className="category-arrow">›</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          renderForm()
        )}
      </div>
    </div>
  );
}

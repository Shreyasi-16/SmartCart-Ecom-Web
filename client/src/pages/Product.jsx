import React, { useEffect, useState } from "react";
import "./Product.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Product() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState(null); 
  const [selectedFilter, setSelectedFilter] = useState("Latest Products");
  const [price, setPrice] = useState(5000); // default ₹5000
  const [selectedSizes, setSelectedSizes] = useState([]); // empty initially

  useEffect(() => {
    fetch("http://localhost:5000/products/fetchProducts")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // If a subcategory is active, refetch that
    if (activeSubcategoryId) {
      fetchProductsByCategory(activeSubcategoryId);
    }
    // Otherwise, refetch the main category if it has an ID
    else if (openCategory) {
      const { id } = categories[openCategory];
      if (id) fetchProductsByCategory(Number(id));
    }
  }, [price]); // runs whenever price changes


  // ✅ Keep your categories
  const categories =  {
  Cars: { id: "1", subcats: [] },
  "Mobile Phones": { id: "201", subcats: [] },
  Tablets: { id: "202", subcats: [] },
  "Two-Wheelers": { id: "3", subcats: [] },
  TVs: { id: "401", subcats: [] },
  Laptops: { id: "402", subcats: [] },
  Cameras: { id: "403", subcats: [] },
  Fridges: { id: "405", subcats: [] },
  "Washing Machines": { id: "406", subcats: [] },
  "Furniture & Decor": { id: "5", subcats: [] },
  Pets: { id: "8", subcats: [] },

  Fashion: {
    id: null, // handled by subcategories
    subcats: [
      { name: "Women Clothing", id: "601" },
      { name: "Women Accessories", id: "602" },
      { name: "Men Clothing", id: "603" },
      { name: "Men Accessories", id: "604" },
      { name: "Kids Clothing", id: "605" },
      { name: "Kids Accessories", id: "606" },
    ],
  },

  "Books, Sports & Hobbies": {
    id: null, // handled by subcategories
    subcats: [
      { name: "Books", id: "701" },
      { name: "Sports", id: "702" },
      { name: "Hobbies", id: "703" },
    ],
  },
};

//FETCH FUNCTION

const fetchProductsByCategory = (categoryId) => {
  if (!categoryId) return; // safety check
  setLoading(true);

  fetch(`http://localhost:5000/products/fetchProducts?categoryId=${categoryId}&price=${price}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    })
    .then((data) => {
      setProducts(data);
      setLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setLoading(false);
    });
};

  if (loading)
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );

  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="product-page">
      {/* ✅ Sidebar */}
      <aside className="sidebar">

            {/* ✅ Categories Card */}
            <div className="card categories-card">
              <h3 className="card-title">Categories</h3>
             <ul className="category-list">
  {Object.entries(categories).map(([cat, { id, subcats }]) => (
    <li key={cat} className={`category-item ${openCategory === cat ? "open" : ""}`}>
      <div
        className="category-header"
        onClick={() => {
          // Toggle subcategory open/close
          setOpenCategory(openCategory === cat ? null : cat);
          
          // Fetch products only if category has an ID
          if (id) fetchProductsByCategory(Number(id));
        }}
      >
        <span>{cat}</span>
        {subcats.length > 0 &&
          (openCategory === cat ? <FaChevronUp className="icon" /> : <FaChevronDown className="icon" />)}
      </div>

      {subcats.length > 0 && openCategory === cat && (
        <ul className="subcategory-list">
          {subcats.map((sub) => (
            <li key={sub.id}>
              <span
                className="subcategory-link"
                onClick={() => fetchProductsByCategory(Number(sub.id))}
              >
                {sub.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  ))}
</ul>



            </div>

            {/* ✅ Price Filter Card */}
            <div className="card price-card">
              <h4 className="card-title">Filter by Price</h4>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="price-range"
              />
              <p className="price-text">Up to ₹ {price}</p>
            </div>

              {/* ✅ Size Filter Card
              <div className="card size-card">
                <h4 className="card-title">Filter by Size</h4>
                <div className="size-options">
                  {["S", "M", "L", "XL", "XXL"].map((s) => (
                    <label key={s} className="size-label">
                      <input
                        type="checkbox"
                        value={s}
                        checked={selectedSizes.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSizes([...selectedSizes, s]);
                          } else {
                            setSelectedSizes(selectedSizes.filter((sz) => sz !== s));
                          }
                        }}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div> */}

          </aside>



      {/* ✅ Main Section */}
      <main className="product-main">
        <div className="topbar">
            <h2>Explore All Products</h2>

            <div className="dropdown">
              <button
                className="dropdown-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {selectedFilter} {showDropdown ? "▲" : "▼"}
              </button>

              {showDropdown && (
                <ul className="dropdown-menu">
                  {["Latest Products", "Best Selling"].map((option) => (
                    <li
                      key={option}
                      className={selectedFilter === option ? "active" : ""}
                      onClick={() => {
                        setSelectedFilter(option);
                        setShowDropdown(false);
                      }}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>




        <div className="product-grid">
          {products.length === 0 ? (
            <p>No products found.</p>
          ) : (
            products.map((p) => (
              <div className="product-card" key={p._id}>
                <img
                  src={
                    p.photos && p.photos.length > 0
                      ? p.photos[0]
                      : "/defaultBG.jpg"
                  }
                  alt={p.title}
                  className="product-img"
                  onError={(e) => {
                    e.target.src = "/defaultBG.jpg";
                  }}
                />
                <div className="product-content">
                  <h3 className="product-title">{p.title}</h3>
                  <p className="product-price">₹ {p.price}</p>
                  <button className="add-btn">Add to Cart</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import "./Product.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate } from "react-router-dom"; 
import { useLocation } from "react-router-dom";


export default function Product() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCategory, setOpenCategory] = useState("All");
  const [activeSubcategoryId, setActiveSubcategoryId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("Latest Products");

  const navigate = useNavigate();
  // Tiered price steps
  const priceSteps = {
    All: [
      { min: 50, max: 5000, step: 50 },
      { min: 5000, max: 50000, step: 500 },
      { min: 50000, max: 5000000, step: 10000 },
    ],
    Cars: [
      { min: 10000, max: 100000, step: 10000 },
      { min: 100000, max: 1000000, step: 50000 },
      { min: 1000000, max: 5000000, step: 100000 },
    ],
    "Mobile Phones": [
      { min: 500, max: 5000, step: 500 },
      { min: 5000, max: 50000, step: 5000 },
      { min: 50000, max: 200000, step: 10000 },
    ],
    Tablets: [
      { min: 1000, max: 10000, step: 500 },
      { min: 10000, max: 50000, step: 5000 },
      { min: 50000, max: 150000, step: 10000 },
    ],
    "Two-Wheelers": [
      { min: 5000, max: 50000, step: 5000 },
      { min: 50000, max: 500000, step: 25000 },
      { min: 500000, max: 2000000, step: 50000 },
    ],
    TVs: [
      { min: 2000, max: 20000, step: 1000 },
      { min: 20000, max: 200000, step: 10000 },
      { min: 200000, max: 500000, step: 50000 },
    ],
    Laptops: [
      { min: 5000, max: 50000, step: 1000 },
      { min: 50000, max: 200000, step: 5000 },
      { min: 200000, max: 300000, step: 10000 },
    ],
    Fashion: [
      { min: 50, max: 1000, step: 50 },
      { min: 1000, max: 10000, step: 500 },
      { min: 10000, max: 50000, step: 1000 },
    ],
    Pets: [
      { min: 100, max: 1000, step: 50 },
      { min: 1000, max: 10000, step: 500 },
      { min: 10000, max: 50000, step: 1000 },
    ],
    Books: [
      { min: 50, max: 500, step: 50 },
      { min: 500, max: 5000, step: 250 },
      { min: 5000, max: 20000, step: 1000 },
    ],
    // Subcategories example
    "Women Clothing": [
      { min: 50, max: 500, step: 50 },
      { min: 500, max: 5000, step: 500 },
      { min: 5000, max: 20000, step: 1000 },
    ],
    "Men Clothing": [
      { min: 50, max: 500, step: 50 },
      { min: 500, max: 5000, step: 500 },
      { min: 5000, max: 20000, step: 1000 },
    ],
    "Books": [
      { min: 50, max: 500, step: 50 },
      { min: 500, max: 5000, step: 250 },
      { min: 5000, max: 20000, step: 1000 },
    ],
  };

  const categories = {
    Cars: { id: "1", subcats: [] },
    "Mobile Phones": { id: "201", subcats: [] },
    Tablets: { id: "202", subcats: [] },
    "Two-Wheelers": { id: "3", subcats: [] },
    TVs: { id: "401", subcats: [] },
    Laptops: { id: "402", subcats: [] },
    Cameras: { id: "403", subcats: [] },
    Fridges: { id: "404", subcats: [] },
    "Washing Machines": { id: "405", subcats: [] },
    "Furniture & Decor": { id: "5", subcats: [] },
    Pets: { id: "8", subcats: [] },
    Fashion: {
      id: null,
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
      id: null,
      subcats: [
        { name: "Books", id: "701" },
        { name: "Sports", id: "702" },
        { name: "Hobbies", id: "703" },
      ],
    },
  };
  //HOME CATEGORIES
  // Get state passed from Home
const location = useLocation();
const selectedCategory = location.state?.selectedCategory;

const categoryIdMap = {
  Fashion: "601",
  Electronics: "402",
  Furniture: "5",
  Decor: "5",
  "Books & Hobbies": "701",
  Mobiles: "201",
  Accessories: "602",
  Cars: "1",
  Bikes: "3",
  Pets: "8",
};

const initialCategoryId = selectedCategory ? categoryIdMap[selectedCategory] : null;


// Build the fetch URL
let fetchUrl = "http://localhost:5000/fetchProducts";
if (selectedCategory && categoryIdMap[selectedCategory]) {
  fetchUrl += `?categoryId=${categoryIdMap[selectedCategory]}`;
}




  const [minPrice, setMinPrice] = useState(priceSteps.All[0].min);
  const [maxPrice, setMaxPrice] = useState(priceSteps.All[priceSteps.All.length - 1].max);

  // Update min/max defaults based on category/subcategory
  useEffect(() => {
    let steps;
    if (activeSubcategoryId) {
      const subcatName = Object.values(categories)
        .flatMap(c => c.subcats || [])
        .find(s => Number(s.id) === activeSubcategoryId)?.name;
      steps = priceSteps[subcatName] || priceSteps[openCategory] || priceSteps.All;
    } else {
      steps = priceSteps[openCategory] || priceSteps.All;
    }
    setMinPrice(steps[0].min);
    setMaxPrice(steps[steps.length - 1].max);
  }, [openCategory, activeSubcategoryId]);

 const fetchProducts = () => {
  let url = `http://localhost:5000/products/fetchProducts?`;


  if (minPrice !== "below") url += `minPrice=${minPrice}&`;
  if (maxPrice !== "above") url += `maxPrice=${maxPrice}&`;

  if (activeSubcategoryId) url += `categoryId=${activeSubcategoryId}`;
  else if (openCategory && categories[openCategory]?.id) url += `categoryId=${categories[openCategory].id}`;
  else if (initialCategoryId) url += `categoryId=${initialCategoryId}`;
  
  setLoading(true);
  fetch(url)
    .then(res => { if (!res.ok) throw new Error("Failed to fetch products"); return res.json(); })
    .then(data => setProducts(data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
};


  useEffect(() => { fetchProducts(); }, [minPrice, maxPrice, activeSubcategoryId, openCategory]);

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  const generatePriceOptions = (isMin) => {
    let steps;
    if (activeSubcategoryId) {
      const subcatName = Object.values(categories)
        .flatMap(c => c.subcats || [])
        .find(s => Number(s.id) === activeSubcategoryId)?.name;
      steps = priceSteps[subcatName] || priceSteps[openCategory] || priceSteps.All;
    } else {
      steps = priceSteps[openCategory] || priceSteps.All;
    }

    const options = [];
    if (isMin) options.push("below");
    steps.forEach(range => {
      for (let val = range.min; val <= range.max; val += range.step) {
        if (!isMin && val < minPrice) continue;
        options.push(val);
      }
    });
    if (!isMin) options.push("above");
    return options;
  };

  return (
    <div className="product-page">
      <aside className="sidebar">
        <div className="card categories-card">
          <h3 className="card-title">Categories</h3>
          <ul className="category-list">
            <li className={`category-item ${openCategory === "All" ? "open" : ""}`} onClick={() => { setOpenCategory("All"); setActiveSubcategoryId(null); }}>
              <div className="category-header"><span>All Categories</span></div>
            </li>
            {Object.entries(categories).map(([cat, { id, subcats }]) => (
              <li key={cat} className={`category-item ${openCategory === cat ? "open" : ""}`}>
                <div className="category-header" onClick={() => { setOpenCategory(openCategory === cat ? null : cat); setActiveSubcategoryId(null); }}>
                  <span>{cat}</span>
                  {subcats.length > 0 && (openCategory === cat ? <FaChevronUp /> : <FaChevronDown />)}
                </div>
                {subcats.length > 0 && openCategory === cat && (
                  <ul className="subcategory-list">
                    {subcats.map((sub) => (
                      <li key={sub.id}>
                        <span className="subcategory-link" onClick={() => setActiveSubcategoryId(Number(sub.id))}>{sub.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card price-card">
          <h4 className="card-title">Filter by Price</h4>
          <div className="price-inputs">
            <select value={minPrice} onChange={(e) => setMinPrice(e.target.value)}>
              {generatePriceOptions(true).map(val => (
                <option key={val} value={val}>
                  {val === "below" ? `Below ₹${priceSteps[openCategory]?.[0]?.min || priceSteps.All[0].min}` : `₹${val}`}
                </option>
              ))}
            </select>
            <span>to</span>
            <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
              {generatePriceOptions(false).map(val => (
                <option key={val} value={val}>
                  {val === "above" ? `Above ₹${priceSteps[openCategory]?.[priceSteps[openCategory].length-1]?.max || priceSteps.All[priceSteps.All.length-1].max}` : `₹${val}`}
                </option>
              ))}
            </select>
          </div>
          <p className="price-text">
            {minPrice === "below" ? `Below ₹${priceSteps[openCategory]?.[0]?.min || priceSteps.All[0].min}` : `₹${minPrice}`} to 
            {maxPrice === "above" ? ` Above ₹${priceSteps[openCategory]?.[priceSteps[openCategory].length-1]?.max || priceSteps.All[priceSteps.All.length-1].max}` : ` ₹${maxPrice}`}
          </p>
        </div>
      </aside>

      <main className="product-main">
        <div className="topbar">
          <h2>Explore All Products</h2>
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => setSelectedFilter(selectedFilter === "Latest Products" ? "Best Selling" : "Latest Products")}>
              {selectedFilter} {selectedFilter === "Latest Products" ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <div className="product-grid">
          {products.length === 0 ? <p>No products found.</p> : products.map((p) => (
            <div className="product-card" key={p._id}>
              <img src={p.photos && p.photos.length > 0 ? p.photos[0] : "/defaultBG.jpg"} alt={p.title} className="product-img" onError={(e) => { e.target.src = "/defaultBG.jpg"; }} />
              <div className="product-content">
                <h3 className="product-title">{p.title}</h3>
                <p className="product-price">₹ {p.price}</p>
                <button
                  className="add-btn"
                  onClick={() => {
                       navigate(`/product/${p._id}`)
                        setResults([]);
                        setQuery("");
                      }}
                    >
                   View
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

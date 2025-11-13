import React, { useEffect, useState } from "react";
import "./Product.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHeart, FaShoppingCart } from "react-icons/fa";
import { logEvent } from "../utils/logEvent";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function Product() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openCategory, setOpenCategory] = useState("All");
  const [activeSubcategoryId, setActiveSubcategoryId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("random");

  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState([]); // array of product IDs in cart

  // inside Product component
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);

  // Get Firebase user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  // Get MongoDB user ID
  useEffect(() => {
    if (!firebaseUser?.uid) return;
    fetch(`http://localhost:5000/api/users/getId/${firebaseUser.uid}`)
      .then((res) => res.json())
      .then((data) => setMongoId(data._id || data?.data?._id))
      .catch((err) => console.error(err));
  }, [firebaseUser]);

  // 🟢 Fetch existing cart products for this user
  useEffect(() => {
    if (!mongoId) return;

    fetch(`http://localhost:5000/api/cart/${mongoId}`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data.cart;
        const productIds = items.map(
          (item) => item.productId?._id || item.productId
        );
        setCartItems(productIds); // store only product IDs
      })
      .catch((err) => console.error("Error fetching cart:", err));
  }, [mongoId]);

  // Inside Product component
  const [wishlistItems, setWishlistItems] = useState([]); // product IDs in wishlist

  // ❤️ Fetch Wishlist Items
  useEffect(() => {
    if (!mongoId) return;

    const fetchWishlist = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/wishlist/${mongoId}`
        );
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Wishlist fetch did not return JSON:", text);
          return;
        }
        const ids = (data.wishlist || []).map(
          (item) => item.productId?._id || item.productId
        );
        setWishlistItems(ids);
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };

    fetchWishlist();
  }, [mongoId]);

  // ❤️ Add/Remove from Wishlist
  const handleToggleWishlist = async (productId) => {
    if (!mongoId) {
      alert("Please login first to manage wishlist");
      return;
    }

    const isInWishlist = wishlistItems.includes(productId);

    try {
      const res = await fetch(
        isInWishlist
          ? `http://localhost:5000/api/wishlist/${mongoId}/${productId}`
          : `http://localhost:5000/api/wishlist`,
        {
          method: isInWishlist ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: isInWishlist
            ? null
            : JSON.stringify({ userId: mongoId, productId }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Wishlist operation failed");

      setWishlistItems((prev) =>
        isInWishlist
          ? prev.filter((id) => id !== productId)
          : [...prev, productId]
      );

      alert(isInWishlist ? "Removed from wishlist!" : "Added to wishlist!");
      //logevent
      await logEvent({
        userId: mongoId,
        productId,
        eventType: isInWishlist ? "wishlist_remove" : "wishlist",
      });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!mongoId) {
      alert("Please login first to add products to cart");
      return;
    }

    if (cartItems.includes(productId)) {
      alert("Product is already in your cart!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mongoId, productId, quantity: 1 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add to cart");

      setCartItems((prev) => [...prev, productId]);
      //logevent
      await logEvent({ userId: mongoId, productId, eventType: "cart" });

      alert("Product added to cart!");
    } catch (err) {
      alert("Error adding product to cart: " + err.message);
    }
  };

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
    Books: [
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

  // From Home (deep-link)
  const selectedCategory = location.state?.selectedCategory;

  const categoryIdMap = {
    "Women Clothing": "601",
    Laptops: "402",
    Furniture: "5",
    Books: "701",
    Mobiles: "201",
    "Women Accessories": "602",
    Cars: "1",
    Bikes: "3",
    Pets: "8",
  };

  const initialCategoryId = selectedCategory
    ? categoryIdMap[selectedCategory]
    : null;

  // Price filter state
  const [minPrice, setMinPrice] = useState(priceSteps.All[0].min);
  const [maxPrice, setMaxPrice] = useState(
    priceSteps.All[priceSteps.All.length - 1].max
  );

  // Apply deep-link (when coming from Home)
  useEffect(() => {
    if (initialCategoryId) {
      const inFashion = categories.Fashion.subcats.some(
        (s) => s.id === initialCategoryId
      );
      if (inFashion) setOpenCategory("Fashion");
      setActiveSubcategoryId(Number(initialCategoryId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategoryId]);

  // Auto-adjust price range when category/subcategory changes
  useEffect(() => {
    let steps;
    if (activeSubcategoryId) {
      const subcatName = Object.values(categories)
        .flatMap((c) => c.subcats || [])
        .find((s) => Number(s.id) === activeSubcategoryId)?.name;
      steps =
        priceSteps[subcatName] || priceSteps[openCategory] || priceSteps.All;
    } else {
      steps = priceSteps[openCategory] || priceSteps.All;
    }
    setMinPrice(steps[0].min);
    setMaxPrice(steps[steps.length - 1].max);
  }, [openCategory, activeSubcategoryId]);

  // Build and fetch (no pagination)
  const fetchProducts = (sort = "latest") => {
    setSelectedFilter(sort);

    const params = new URLSearchParams();

    if (minPrice !== "below") params.set("minPrice", String(minPrice));
    if (maxPrice !== "above") params.set("maxPrice", String(maxPrice));

    if (activeSubcategoryId) {
      params.set("categoryId", String(activeSubcategoryId));
    } else if (openCategory && categories[openCategory]?.id) {
      params.set("categoryId", String(categories[openCategory].id));
    } else if (initialCategoryId) {
      params.set("categoryId", String(initialCategoryId));
    }

    params.set("sort", sort);

    const url = `http://localhost:5000/products/fetchProducts?${params.toString()}`;

    setLoading(true);
    if (mongoId) {
        logEvent({
            userId: mongoId,
            eventType: "search",
            searchQuery: `${openCategory || "All"} | ${activeSubcategoryId || ""} | ${minPrice}-${maxPrice}`,
          });
        }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then(({ data }) => {
        setProducts(data || []);
        if (mongoId && data?.length) {
                  data.slice(0, 20).forEach((p) => {
                    logEvent({ userId: mongoId, productId: p._id, eventType: "view" });
                  });
                }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // Initial + whenever filters/sort change (no page deps)
  useEffect(() => {
    fetchProducts(selectedFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice, activeSubcategoryId, openCategory, selectedFilter]);

  if (loading)
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  const generatePriceOptions = (isMin) => {
    let steps;
    if (activeSubcategoryId) {
      const subcatName = Object.values(categories)
        .flatMap((c) => c.subcats || [])
        .find((s) => Number(s.id) === activeSubcategoryId)?.name;
      steps =
        priceSteps[subcatName] || priceSteps[openCategory] || priceSteps.All;
    } else {
      steps = priceSteps[openCategory] || priceSteps.All;
    }

    const seen = new Set();
    const options = [];

    if (isMin) options.push("below");

    for (const range of steps) {
      for (let val = range.min; val <= range.max; val += range.step) {
        if (!isMin) {
          // keep values >= current min when building max options
          const minNumeric =
            minPrice === "below" ? -Infinity : Number(minPrice);
          if (val < minNumeric) continue;
        }
        if (!seen.has(val)) {
          seen.add(val);
          options.push(val);
        }
      }
    }

    if (!isMin) options.push("above");
    return options;
  };

  return (
    <div className="product-page">
      <aside className="sidebar">
        <div className="card categories-card">
          <h3 className="card-title">Categories</h3>
          <ul className="category-list">
            <li
              className={`category-item ${
                openCategory === "All" ? "open" : ""
              }`}
              onClick={() => {
                setOpenCategory("All");
                setActiveSubcategoryId(null);
              }}
            >
              <div className="category-header">
                <span>All Categories</span>
              </div>
            </li>

            {Object.entries(categories).map(([cat, { id, subcats }]) => (
              <li
                key={cat}
                className={`category-item ${
                  openCategory === cat ? "open" : ""
                }`}
              >
                <div
                  className="category-header"
                  onClick={() => {
                    setOpenCategory(openCategory === cat ? null : cat);
                    setActiveSubcategoryId(null);
                  }}
                >
                  <span>{cat}</span>
                  {subcats.length > 0 &&
                    (openCategory === cat ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    ))}
                </div>

                {subcats.length > 0 && openCategory === cat && (
                  <ul className="subcategory-list">
                    {subcats.map((sub) => (
                      <li key={sub.id}>
                        <span
                          className="subcategory-link"
                          onClick={() => setActiveSubcategoryId(Number(sub.id))}
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

        <div className="card price-card">
          <h4 className="card-title">Filter by Price</h4>

          <div className="price-inputs">
            <select
              value={minPrice}
              onChange={(e) =>
                setMinPrice(
                  e.target.value === "below" ? "below" : Number(e.target.value)
                )
              }
            >
              {generatePriceOptions(true).map((val, i) => (
                <option key={`${val}-${i}`} value={val}>
                  {val === "below"
                    ? `Below ₹${
                        priceSteps[openCategory]?.[0]?.min ||
                        priceSteps.All[0].min
                      }`
                    : `₹${val}`}
                </option>
              ))}
            </select>

            <select
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(
                  e.target.value === "above" ? "above" : Number(e.target.value)
                )
              }
            >
              {generatePriceOptions(false).map((val, i) => (
                <option key={`${val}-${i}`} value={val}>
                  {val === "above"
                    ? `Above ₹${
                        priceSteps[openCategory]?.[
                          priceSteps[openCategory].length - 1
                        ]?.max || priceSteps.All[priceSteps.All.length - 1].max
                      }`
                    : `₹${val}`}
                </option>
              ))}
            </select>
          </div>

          <p className="price-text">
            {minPrice === "below"
              ? `Below ₹${
                  priceSteps[openCategory]?.[0]?.min || priceSteps.All[0].min
                }`
              : `₹${minPrice}`}{" "}
            to
            {maxPrice === "above"
              ? ` Above ₹${
                  priceSteps[openCategory]?.[
                    priceSteps[openCategory].length - 1
                  ]?.max || priceSteps.All[priceSteps.All.length - 1].max
                }`
              : ` ₹${maxPrice}`}
          </p>
        </div>
      </aside>

      <main className="product-main">
        <div className="topbar">
          <h2>
            Explore All Products{" "}
            {products.length ? `(${products.length} results)` : ""}
          </h2>

          {/* Real sort dropdown */}
          <div className="dropdown">
            <select
              className="dropdown-btn"
              onChange={(e) => fetchProducts(e.target.value)}
              value={selectedFilter}
            >
              <option value="latest">Latest Products</option>
              <option value="priceAsc">Price: Low → High</option>
              <option value="priceDesc">Price: High → Low</option>
              <option value="random">Random</option>
            </select>
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
                    typeof p.photos?.[0] === "string" &&
                    /^https?:\/\//i.test(p.photos[0])
                      ? p.photos[0]
                      : "/defaultBG.jpg"
                  }
                  alt={p.title}
                  className="product-img"
                  onError={(e) => {
                    e.currentTarget.src = "/defaultBG.jpg";
                  }}
                />

                {/* Heart + Cart buttons */}
                <div className="card-actions">
                  <FaHeart
                    className={`icon-heart ${
                      wishlistItems.includes(p._id) ? "in-wishlist" : ""
                    }`}
                    onClick={() => handleToggleWishlist(p._id)}
                    title={
                      wishlistItems.includes(p._id)
                        ? "Remove from Wishlist"
                        : "Add to Wishlist"
                    }
                  />
                  <FaShoppingCart
                    className={`icon-cart ${
                      cartItems.includes(p._id) ? "added" : ""
                    }`}
                    onClick={() => handleAddToCart(p._id)}
                  />
                </div>

                <div className="product-content">
                  <h3 className="product-title">{p.title}</h3>
                  <p className="product-price">₹ {p.price}</p>
                  <button
                    className="add-btn"
                    onClick={() => navigate(`/product/${p._id}`)}
                  >
                    View product
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination removed */}
      </main>
    </div>
  );
}

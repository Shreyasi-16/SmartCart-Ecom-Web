import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaUser, FaHeart } from "react-icons/fa";
import { getAuth, signOut } from "firebase/auth";
import app from "../firebase";
import "./Header.css";
import DropDownMenu from "./DropDownMenu";

const auth = getAuth(app);

export function Header() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) {
        fetch(`http://localhost:5000/products/search?query=${query}`)
          .then((res) => res.json())
          .then((data) => setResults(data.data))
          .catch((err) => console.error("Error fetching data:", err));
      } else {
        setResults([]);
      }
    }, 300); // debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    if (query.length > 1) {
      fetch(`http://localhost:3000/search?query=${query}`)
        .then((res) => res.json())
        .then((data) => setResults(data.data))
        .catch((err) => console.error("Error fetching data:", err));
    } else {
      setResults([]);
    }
  }, [query]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      navigate("/login");
    });
  };

  return (
    <>
      <header className="header">
        {/* Row 1 */}
        <div className="header-row">
          {/* Logo */}
          <NavLink to="/" className="navbar-brand fw-bold fs-4">
            <img src="logo.png" height="50px" width="150" alt="SmartCart Logo" />
          </NavLink>

<<<<<<< HEAD
          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search for products..."
                className="form-control me-2"
                style={{ width: "400px", padding: "0.6rem 1rem", fontSize: "1rem" }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <FaSearch size={24} />
              {/* Search results dropdown */}
              {results.length > 0 && (
                <ul className="search-results">
                  {results.map((item) => (
                    <li key={item._id} onClick={() => navigate(`/product/${item._id}`)}>
                      {item.name}
=======
          {/* All Categories + Search bar */}
          <div className="d-flex align-items-center position-relative">
            {/* All Categories Dropdown */}
            <div className="dropdown me-2">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                id="categoryDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                All Categories
              </button>
              <ul className="dropdown-menu" aria-labelledby="categoryDropdown">
                <li>
                  <button className="dropdown-item" onClick={() => navigate("/buy")}>
                    Buy
                  </button>
                </li>
                <li>
                  <button className="dropdown-item" onClick={() => navigate("/sell")}>
                    Sell
                  </button>
                </li>
              </ul>
            </div>

            {/* Search Bar */}
            <div className="search-bar d-flex align-items-center flex-column position-relative">
              <div className="d-flex w-100">
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="form-control me-2"
                  style={{ width: "400px", padding: "0.6rem 1rem", fontSize: "1rem" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <FaSearch size={24} />
              </div>

              {/* Dropdown results */}
              {results.length > 0 && (
                <ul className="dropdown-menu custom-dropdown">
                  {results.map((product) => (
                    <li
                      key={product._id}
                      className="dropdown-item"
                      onClick={() => {
                        navigate(`/product/${product._id}`);
                        setQuery("");
                        setResults([]);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {product.name}
>>>>>>> b7174fc525cfbb105c9c93d078b0375de98f4569
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* User buttons */}
          <div className="user-actions">
            {user ? (
              <>
                <FaUser
                  size={22}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/profile")}
                />
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => navigate("/become-seller")}
                >
                  Sell
                </button>
              </>
            ) : (
              <button className="login btn" onClick={() => navigate("/login")}>
                Login
              </button>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="nav-links">
          {/* Category dropdown in left corner */}
          <div className="category-dropdown">
            <DropDownMenu />
          </div>

          <div className="nav-center">
            <NavLink to="/" className="nav-link">
              Home
            </NavLink>
            <NavLink to="/product" className="nav-link">
              Products
            </NavLink>
            <NavLink to="/cart" className="nav-link d-flex align-items-center gap-1">
              <FaShoppingCart /> Cart
            </NavLink>
            <NavLink to="/wishlist" className="nav-link d-flex align-items-center gap-1">
              <FaHeart /> Wishlist
            </NavLink>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="header-spacer"></div>
    </>
  );
}

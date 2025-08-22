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

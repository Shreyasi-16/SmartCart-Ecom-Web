import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaUser, FaHeart } from "react-icons/fa";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth"; // ⬅️ import this
import app from "../firebase";
import "./Header.css";
import DropDownMenu from "./DropDownMenu";

const auth = getAuth(app);

export function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // ✅ Listen for login/logout state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) {
        fetch(`http://localhost:5000/products/search?query=${query}`)
          .then((res) => res.json())
          .then((data) => {
            console.log("Search results:", data.data);
            setResults(data.data);
          })
          .catch((err) => console.error("Error fetching data:", err));
      } else {
        setResults([]);
      }
    }, 300);

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
            <div className="search-wrapper" style={{ position: "relative" }}>
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
                <ul
                  className="search-results"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    backgroundColor: "white",
                    color: "black",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    marginTop: "5px",
                    listStyle: "none",
                    padding: 0,
                    maxHeight: "250px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0px 4px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  {results.map((item) => (
                    <li
                      key={item._id}
                      onClick={() => {
                        navigate(`/product/${item._id}`);
                        setResults([]);
                        setQuery("");
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "white")
                      }
                    >
                      {/* Product Image with fallback */}
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || "Product"}
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.png";
                          }}
                        />
                      ) : (
                        <img
                          src="/placeholder.png"
                          alt="No Image"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      )}

                      {/* Product Name */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>
                          {item.name || "No Name"}
                        </span>
                      </div>
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
                  onClick={() => navigate("/Sell")}
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

      <div className="header-spacer"></div>
    </>
  );
}

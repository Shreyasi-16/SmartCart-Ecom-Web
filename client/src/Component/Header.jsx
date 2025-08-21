import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaUser, FaHeart } from "react-icons/fa";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import app from "../firebase";
import "./Header.css";

const auth = getAuth(app);

export function Header() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
      <header className="header-section">
        {/* Row 1 */}
        <div className="header-top d-flex align-items-center justify-content-between p-2">
          {/* Logo */}
          <NavLink to="/" className="navbar-brand fw-bold fs-4">
            SmartCart
          </NavLink>

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
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right side: Login/Profile + Become Seller */}
          <div className="d-flex align-items-center gap-3">
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
                  Become a Seller
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Login
              </button>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="header-bottom d-flex align-items-center justify-content-center gap-4 py-2 border-top">
          <NavLink to="/" className="nav-link">Home</NavLink>
          <NavLink to="/product" className="nav-link">Products</NavLink>
          <NavLink to="/cart" className="nav-link d-flex align-items-center gap-1">
            <FaShoppingCart /> Cart
          </NavLink>
          <NavLink to="/wishlist" className="nav-link d-flex align-items-center gap-1">
            <FaHeart /> Wishlist
          </NavLink>
        </div>
      </header>

      {/* Spacer */}
      <div className="header-spacer"></div>
    </>
  );
}

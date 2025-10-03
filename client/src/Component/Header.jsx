import React, { useEffect, useRef,useState } from "react";
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
   const searchRef = useRef(null); // 🔑 wrapper ref
   const [highlightIndex, setHighlightIndex] = useState(-1);


   // ✅ Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch search results
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) {
        fetch(`http://localhost:5000/products/search?query=${query}`)
          .then((res) => res.json())
          .then((data) => setResults(data))
          .catch((err) => console.error("Error fetching data:", err));
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ✅ Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
        setQuery("");
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle keyboard navigation
  const handleKeyDown = (e) => {
  if (results.length === 0) return;

  if (e.key === "ArrowDown") {
    setHighlightIndex((prev) => {
      const newIndex = (prev + 1) % results.length;
      setQuery(results[newIndex].title); // show product in input
      return newIndex;
    });
  } else if (e.key === "ArrowUp") {
    setHighlightIndex((prev) => {
      const newIndex = (prev - 1 + results.length) % results.length;
      setQuery(results[newIndex].title); // show product in input
      return newIndex;
    });
  } else if (e.key === "Enter") {
    if (highlightIndex >= 0) {
      // navigate to selected product
      navigate(`/product/${results[highlightIndex]._id}`);
      setResults([]);
      setHighlightIndex(-1);
    } else {
      // default: take first result
      if (results[0]) {
        navigate(`/product/${results[0]._id}`);
        setResults([]);
      }
    }
  }
};


  // ✅ Handle search icon click
  const handleSearchClick = () => {
    if (results.length > 0) {
      navigate(`/product/${results[0]._id}`);
      setResults([]);
      setQuery("");
    }
  };
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
            <img src="/logo-transparent-png.png" height="100%" width="100%" alt="SmartCart Logo" />
          </NavLink>


          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-wrapper" style={{ position: "relative" }} ref={searchRef}>
            <input
              type="text"
              placeholder="Search for products..."
              className="form-control me-2"
              style={{ width: "400px", padding: "0.6rem 1rem", fontSize: "1rem" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown} // 🔑 keyboard navigation
            />
            <FaSearch
              size={24}
              onClick={handleSearchClick} // 🔑 click search icon
            />
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
                      {item.photos[0] ? (
                        <img
                          src={item.photos[0]}
                          alt={item.title || "Product"}
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
                          {item.title || "No Name"}
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
          {/* <div className="category-dropdown">
            <DropDownMenu />
          </div> */}

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
            <NavLink to="/aboutus" className="nav-link">
              About us
            </NavLink>
            <NavLink to="/contact" className="nav-link">
              Contact
            </NavLink>
          </div>
        </div>
      </header>

      <div className="header-spacer"></div>
    </>
  );
}

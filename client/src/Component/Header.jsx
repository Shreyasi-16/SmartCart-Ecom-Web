import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaShoppingCart,
  FaUser,
  FaHeart,
  FaCamera,
} from "react-icons/fa";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth"; // ⬅️ import this
import app from "../firebase";
import "./Header.css";
import DropDownMenu from "./DropDownMenu";
import { logEvent } from "../utils/logEvent";


const auth = getAuth(app);

export function Header() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const itemRefs = useRef([]);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isActiveSearch, setIsActiveSearch] = useState(false);

  // ✅ Updated handleImageUpload (just dedupe results after normalization)
  // const handleImageUpload = async (e) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   // local preview
  //   setUploadedImage(URL.createObjectURL(file));

  //   const CLOUDINARY_CLOUD_NAME = "dzvfekrgb";
  //   const UPLOAD_PRESET = "j_default";

  //   try {
  //     // 1) upload to Cloudinary
  //     const formData = new FormData();
  //     formData.append("file", file);
  //     formData.append("upload_preset", UPLOAD_PRESET);

  //     const cloudinaryRes = await fetch(
  //       `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
  //       { method: "POST", body: formData }
  //     );
  //     const cloudinaryData = await cloudinaryRes.json();
  //     const uploadedFileUrl = cloudinaryData.secure_url;
  //     console.log("☁️ Cloudinary URL:", uploadedFileUrl);

  //     // 2) call backend visual-search
  //     const res = await fetch("http://localhost:5000/api/visual-search", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ imageUrl: uploadedFileUrl }),
  //     });

  //     const data = await res.json();
  //     console.log("🔎 Visual search raw:", data);

  //     // 3) normalize visual-search results
  //     const normalized = (Array.isArray(data) ? data : []).map((r, idx) => {
  //       const id = r._id || r.productId || r.id || `vs-${idx}`;
  //       let photos = [];
  //       if (r.photos) photos = Array.isArray(r.photos) ? r.photos : [r.photos];
  //       else if (r.photo) photos = [r.photo];
  //       else if (r.image) photos = [r.image];

  //       const photosNormalized = photos
  //   .map((p) => (p?.url ? p.url : null)) // get url from object
  //   .filter(Boolean);

  //       return {
  //         _id: id,
  //         title: r.title || r.name || "Untitled",
  //         photos: photosNormalized,
  //         raw: r,
  //       };
  //     });

  //     // 4) ✅ Dedupe by _id to fix React key warning
  //     const dedupedNormalized = Array.from(
  //       new Map(normalized.map((item) => [item._id, item])).values()
  //     );

  //     console.log("🔎 Visual search normalized & deduped:", dedupedNormalized);

  //     setResults(dedupedNormalized);
  //   } catch (err) {
  //     console.error("❌ Error in visual search:", err);
  //   }
  // };

  const [mongoId, setMongoId] = useState(null);

// 🧠 Get MongoDB user ID when Firebase user changes
useEffect(() => {
  if (!user?.uid) return;
  fetch(`http://localhost:5000/api/users/getId/${user.uid}`)
    .then((res) => res.json())
    .then((data) => setMongoId(data._id || data?.data?._id))
    .catch((err) => console.error("Failed to get Mongo user:", err));
}, [user]);


  // ------------------- AUTH -------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      navigate("/login");
    });
  };

  // ------------------- SEARCH FETCH -------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) {
        fetch(`http://localhost:5000/products/search?query=${query}`)
          .then((res) => res.json())
          .then((data) => {
            const textualNormalized = (Array.isArray(data) ? data : []).map(
              (r, idx) => {
                const id = r._id || r.productId || r.id || `ts-${idx}`;
                let photos = [];
                if (r.photos)
                  photos = Array.isArray(r.photos) ? r.photos : [r.photos];
                else if (r.photo) photos = [r.photo];
                else if (r.image) photos = [r.image];

                const photosNormalized = photos
                  .map((p) => (typeof p === "string" ? p : p?.url))
                  .filter(Boolean);

                return {
                  _id: id,
                  title: r.title || r.name || "Untitled",
                  photos: photosNormalized,
                  type: "textual",
                };
              }
            );
            setResults(textualNormalized);
            setHighlightIndex(0);
            if (mongoId && query.trim().length > 1) {
              logEvent({
                userId: mongoId,
                eventType: "search",
                searchQuery: query.trim(),
              });
            }

          })
          .catch((err) => console.error("Error fetching data:", err));
      } else {
        setResults([]);
        setHighlightIndex(-1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ------------------- OUTSIDE CLICK -------------------
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target) &&
        !e.target.closest(".search-results")
      ) {
        setResults([]);
        setHighlightIndex(-1);
        setIsActiveSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------- SELECT PRODUCT -------------------
  const handleSelectProduct = (item) => {
    navigate(`/product/${item._id}`);
    setResults([]);
    setHighlightIndex(-1);
    setInputValue(item.title);
    setQuery(item.title);
    setIsActiveSearch(false);
  };

  // ------------------- KEYBOARD NAV -------------------
  const handleKeyDown = (e) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const newIndex = (prev + 1) % results.length;
        itemRefs.current[newIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        setIsActiveSearch(true);
        return newIndex;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const newIndex = (prev - 1 + results.length) % results.length;
        itemRefs.current[newIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        setIsActiveSearch(true);
        return newIndex;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIndex = highlightIndex >= 0 ? highlightIndex : 0;
      handleSelectProduct(results[targetIndex]);
    }
  };

  // ------------------- SEARCH ICON CLICK -------------------
  const handleSearchClick = () => {
    if (results.length === 0) return;
    const targetIndex = highlightIndex >= 0 ? highlightIndex : 0;
    handleSelectProduct(results[targetIndex]);
  };

  // ------------------- GLOBAL KEYBOARD HANDLER (for visual search) -------------------
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (!isActiveSearch || results.length === 0) return;

      // if input is focused, let its own onKeyDown handle
      const inputEl = searchRef.current?.querySelector("input");
      if (document.activeElement === inputEl) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => {
          const newIndex = (prev + 1) % results.length;
          itemRefs.current[newIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          return newIndex;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => {
          const newIndex = (prev - 1 + results.length) % results.length;
          itemRefs.current[newIndex]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          return newIndex;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const targetIndex = highlightIndex >= 0 ? highlightIndex : 0;
        handleSelectProduct(results[targetIndex]);
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isActiveSearch, results, highlightIndex]);

  // ------------------- VISUAL SEARCH -------------------
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedImage(URL.createObjectURL(file));
    setLoading(true);
    setIsActiveSearch(true); // reset dropdown

    const CLOUDINARY_CLOUD_NAME = "dzvfekrgb";
    const UPLOAD_PRESET = "j_default";

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      const uploadedFileUrl = cloudinaryData.secure_url;

      const res = await fetch("http://localhost:5000/api/visual-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedFileUrl }),
      });

      const data = await res.json();
      const normalized = (
        Array.isArray(data.products) ? data.products : []
      ).map((r, idx) => {
        const id = r._id || r.productId || r.id || `vs-${idx}`;
        let photos = [];
        if (r.photos) photos = Array.isArray(r.photos) ? r.photos : [r.photos];
        else if (r.photo) photos = [r.photo];
        else if (r.image) photos = [r.image];

        const photosNormalized = photos
          .map((p) => {
            if (!p) return null;
            if (typeof p === "string") return p;
            if (p.url) return p.url;
            return null;
          })
          .filter(Boolean);

        return {
          _id: id,
          title: r.title || r.name || "Untitled",
          photos: photosNormalized,
          raw: r,
        };
      });

      const deduped = Array.from(
        new Map(normalized.map((item) => [item._id, item])).values()
      );
      setResults(deduped);
      if (mongoId) {
        logEvent({
          userId: mongoId,
          eventType: "search",
          searchQuery: "visual-search",
        });
      }

      setHighlightIndex(0);
      setInputValue(deduped[0]?.title || "");
      setIsActiveSearch(true); // show dropdown
      // 👇 Add this small block
      setTimeout(() => {
        const inputEl = searchRef.current?.querySelector("input");
        if (inputEl) {
          inputEl.focus({ preventScroll: true });
        }
      }, 200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="header">
        {/* Row 1 */}
        <div className="header-row">
          {/* Logo */}
          <NavLink to="/" className="navbar-brand fw-bold fs-4">
            <img
              src="/logo-transparent-png.png"
              height="100%"
              width="100%"
              alt="SmartCart Logo"
            />
          </NavLink>

          {/* ------------------- SEARCH BAR ------------------- */}
          <div className="search-bar">
            <div className="search-wrapper" ref={searchRef}>
              <input
                type="text"
                placeholder="Search for products..."
                className="search-input"
                value={inputValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputValue(val);
                  setQuery(val); // fetch results based on typed query
                  setLastQuery(val); // store for later focus
                  setIsActiveSearch(val.length > 0); // 🔑 show dropdown when typing
                }}
                onFocus={() => {
                  if (inputValue.length > 0) {
                    // Fetch results for existing input value
                    fetch(
                      `http://localhost:5000/products/search?query=${inputValue}`
                    )
                      .then((res) => res.json())
                      .then((data) => {
                        const textualNormalized = (
                          Array.isArray(data) ? data : []
                        ).map((r, idx) => {
                          const id =
                            r._id || r.productId || r.id || `ts-${idx}`;
                          let photos = [];
                          if (r.photos)
                            photos = Array.isArray(r.photos)
                              ? r.photos
                              : [r.photos];
                          else if (r.photo) photos = [r.photo];
                          else if (r.image) photos = [r.image];

                          const photosNormalized = photos
                            .map((p) => (typeof p === "string" ? p : p?.url))
                            .filter(Boolean);

                          return {
                            _id: id,
                            title: r.title || r.name || "Untitled",
                            photos: photosNormalized,
                            type: "textual",
                          };
                        });
                        setResults(textualNormalized);
                        setHighlightIndex(0); // highlight first item
                        setIsActiveSearch(true); // 🔑 show dropdown
                      })
                      .catch((err) =>
                        console.error("Error fetching data:", err)
                      );
                  } else {
                    // Optional: hide dropdown if input empty
                    setResults([]);
                    setIsActiveSearch(false);
                  }
                }}
                onKeyDown={handleKeyDown}
              />

              <FaSearch
                className="search-icon"
                onClick={handleSearchClick} // 🔑 click search icon
              />

              {/* Upload Button */}
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              <button
                className="upload-btn"
                onClick={() => document.getElementById("imageUpload").click()}
              >
                <FaCamera /> Visual Search
              </button>
            </div>

            {/* Image Preview */}
            {uploadedImage && (
              <div className="image-preview">
                <img src={uploadedImage} alt="Preview" />
                <button onClick={() => setUploadedImage(null)}>×</button>
              </div>
            )}

            {/* Search results dropdown */}
            {loading && (
              <div className="search-loading">Processing image... 🔄</div>
            )}

            {results.length > 0 && isActiveSearch && (
              <ul className="search-results">
                {results.map((item, idx) => {
                  const imgSrc =
                    item.photos && item.photos.length > 0
                      ? item.photos[0]
                      : "/placeholder.png";
                  return (
                    <li
                      key={item._id || `vs-${idx}`}
                      ref={(el) => (itemRefs.current[idx] = el)}
                      className={highlightIndex === idx ? "active" : ""}
                      onMouseDown={(e) => e.preventDefault()} // prevent blur on click
                      onClick={() => handleSelectProduct(item)}
                    >
                      <img
                        src={imgSrc}
                        alt={item.title || "Product"}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/placeholder.png";
                        }}
                      />
                      <div>
                        <span>{item.title || "No Name"}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ------------------- USER ACTIONS ------------------- */}
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
            <NavLink
              to="/cart"
              className="nav-link d-flex align-items-center gap-1"
            >
              <FaShoppingCart /> Cart
            </NavLink>
            <NavLink
              to="/wishlist"
              className="nav-link d-flex align-items-center gap-1"
            >
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

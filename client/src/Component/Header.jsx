import React, { useEffect, useState } from "react";
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

const auth = getAuth(app);


export function Header() {
  const [loading, setLoading] = useState(false); // new state

  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const [uploadedImage, setUploadedImage] = useState(null);

 
 
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

const handleImageUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;


 
  // Show local preview
  setUploadedImage(URL.createObjectURL(file));
  setLoading(true); // start loading

  const CLOUDINARY_CLOUD_NAME = "dzvfekrgb";
  const UPLOAD_PRESET = "j_default";

  try {
    // 1) upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const cloudinaryData = await cloudinaryRes.json();
    const uploadedFileUrl = cloudinaryData.secure_url;
    console.log("☁️ Cloudinary URL:", uploadedFileUrl);

    // 2) call backend visual-search
    const res = await fetch("http://localhost:5000/api/visual-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: uploadedFileUrl }),
    });

    const data = await res.json();
    console.log("🔎 Visual search raw:", data);

    // 3) normalize visual-search results
    const normalized = (Array.isArray(data.products) ? data.products : []).map((r, idx) => {
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


    // 4) dedupe by _id to fix React key warning
    const dedupedNormalized = Array.from(
      new Map(normalized.map((item) => [item._id, item])).values()
    );

    console.log("🔎 Visual search normalized & deduped:", dedupedNormalized);

    setResults(dedupedNormalized);
  } catch (err) {
    console.error("❌ Error in visual search:", err);
  } finally {
    setLoading(false); // stop loading
  }
};

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
  const textualNormalized = (Array.isArray(data) ? data : []).map((r, idx) => {
    const id = r._id || r.productId || r.id || `ts-${idx}`;
    let photos = [];
    if (r.photos) photos = Array.isArray(r.photos) ? r.photos : [r.photos];
    else if (r.photo) photos = [r.photo];
    else if (r.image) photos = [r.image];

    const photosNormalized = photos
      .map(p => (typeof p === "string" ? p : p?.url))
      .filter(Boolean);

    return {
      _id: id,
      title: r.title || r.name || "Untitled",
      photos: photosNormalized,
      type: "textual",
    };
  });

  setResults(textualNormalized);
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
            <img
              src="/logo-transparent-png.png"
              height="100%"
              width="100%"
              alt="SmartCart Logo"
            />
          </NavLink>

          {/* Search Bar */}
          <div className="search-bar">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search for products..."
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <FaSearch className="search-icon" />

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
  <div className="search-loading">
    Processing image... 🔄
  </div>
)}

{!loading && results.length > 0 && (
  <ul className="search-results">
    {results.map((item, idx) => {
      const imgSrc = item.photos && item.photos.length > 0 ? item.photos[0] : "/placeholder.png";
      return (
        <li
          key={item._id || `vs-${idx}`}
          onClick={() => {
            navigate(`/product/${item._id}`);
            setResults([]);
            setQuery("");
          }}
        >
          <img
            src={imgSrc}
            alt={item.title || "Product"}
            onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.png"; }}
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

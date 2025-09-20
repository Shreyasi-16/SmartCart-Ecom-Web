import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./Sell.css";
import {
  FaCar,
  FaMobileAlt,
  FaBicycle,
  FaTv,
  FaCouch,
  FaTshirt,
  FaBook,
  FaDog,
} from "react-icons/fa";

export default function Sell() {
  const auth = getAuth();

  // -------------------
  // State Variables
  // -------------------
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [photos, setPhotos] = useState(Array(20).fill(null));
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [owner, setOwner] = useState("");
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    state: "",
    locationMode: "",
    manualLocation: { address: "", pincode: "" },
    gpsLocation: { type: "Point", coordinates: [0, 0] },
    brand: "",
    model: "",
    year: "",
    kmDriven: "",
    vehicleType: "",
    tabletType: "",
    size: "",
    fashionType: "",
    condition: "",
    type: "",
  });

  // -------------------
  // Fetch current user
  // -------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setUserId(currentUser.uid);
    });
    return () => unsubscribe();
  }, [auth]);

  // -------------------
  // Fetch user location from API
  // -------------------
  useEffect(() => {
    if (!user) return;

    fetch(`http://localhost:5000/api/users/getId/${user.uid}`)
      .then((res) => {
        if (!res.ok) throw new Error("User fetch failed");
        return res.json();
      })
      .then((data) => {
        setFormData((prev) => ({
          ...prev,
          city: data.city || "",
          state: data.state || "",
          locationMode: data.locationMode || "gps",
          manualLocation: data.manualLocation || { address: "", pincode: "" },
          gpsLocation: data.gpsLocation || { type: "Point", coordinates: [0, 0] },
        }));
        setLocationConfirmed(true);
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, [user]);

  // -------------------
  // Handle input changes
  // -------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      manualLocation: { ...prev.manualLocation, [name]: value },
      city: name === "city" ? value : prev.city,
      state: name === "state" ? value : prev.state,
    }));
  };

  const handleLocationFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // -------------------
  // Get GPS coordinates
  // -------------------
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          locationMode: "gps",
          gpsLocation: {
            type: "Point",
            coordinates: [pos.coords.longitude, pos.coords.latitude],
          },
          city: prev.city, // Keep city/state separate if you wish
          state: prev.state,
        }));
        alert("GPS location captured!");
      },
      (err) => {
        console.error(err);
        alert("Failed to fetch GPS location.");
      }
    );
  };

  // -------------------
  // Confirm Location
  // -------------------
  const handleConfirmLocation = () => {
    if (formData.locationMode === "manual") {
      if (!formData.city || !formData.state) {
        alert("Please enter city and state for manual location.");
        return;
      }
    }

    setLocationConfirmed(true);
    setIsChangingLocation(false);
    alert(
      `Location confirmed!\nMode: ${formData.locationMode}\nCity: ${formData.city}\nState: ${formData.state}`
    );
  };

  // -------------------
  // Render Location
  // -------------------
  const renderLocation = () => {
    if (isChangingLocation) {
      return (
        <div className="location-form">
          <h3>Update Location</h3>

          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleLocationFieldChange}
            placeholder="City"
            required
          />
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleLocationFieldChange}
            placeholder="State"
            required
          />

          <div>
            <label>
              <input
                type="radio"
                checked={formData.locationMode === "manual"}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    locationMode: "manual",
                    gpsLocation: { type: "Point", coordinates: [0, 0] },
                  }))
                }
              />{" "}
              Manual
            </label>
            <label>
              <input
                type="radio"
                checked={formData.locationMode === "gps"}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    locationMode: "gps",
                    manualLocation: { address: "", pincode: "" },
                  }))
                }
              />{" "}
              GPS
            </label>
          </div>

          {formData.locationMode === "manual" && (
            <>
              <input
                type="text"
                name="address"
                value={formData.manualLocation.address}
                onChange={handleManualLocationChange}
                placeholder="Address"
                required
              />
              <input
                type="text"
                name="pincode"
                value={formData.manualLocation.pincode}
                onChange={handleManualLocationChange}
                placeholder="Pincode"
                required
              />
            </>
          )}

          {formData.locationMode === "gps" && (
            <>
              <button type="button" onClick={handleGetGPS}>
                Get GPS Location
              </button>
              {formData.gpsLocation.coordinates[0] !== 0 && (
                <p>
                  Lat: {formData.gpsLocation.coordinates[1]}, Lng:{" "}
                  {formData.gpsLocation.coordinates[0]}
                </p>
              )}
            </>
          )}

          <button type="button" onClick={handleConfirmLocation}>
            Confirm Location
          </button>
        </div>
      );
    }

    // Confirmed Location
    return (
      <div className="confirmed-location">
        <h4>Location:</h4>
        <p>City: {formData.city}</p>
        <p>State: {formData.state}</p>
        {formData.locationMode === "manual" ? (
          <>
            <p>Address: {formData.manualLocation.address}</p>
            <p>Pincode: {formData.manualLocation.pincode}</p>
          </>
        ) : (
          <p>
            GPS: {formData.gpsLocation.coordinates[1]},{" "}
            {formData.gpsLocation.coordinates[0]}
          </p>
        )}
        <button type="button" onClick={() => setIsChangingLocation(true)}>
          Change Location
        </button>
      </div>
    );
  };

  // -------------------
  // Handle Photo Upload
  // -------------------
  const handlePhotoChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const newPhotos = [...photos];
      newPhotos[index] = URL.createObjectURL(file);
      setPhotos(newPhotos);
    }
  };

  const renderPhotoGrid = () => (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <label key={index} className="photo-box">
          {photo ? <img src={photo} alt={`upload-${index}`} /> : <span className="plus">+</span>}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoChange(e, index)}
            hidden
          />
        </label>
      ))}
    </div>
  );

  // -------------------
  // Categories & Subcategories
  // -------------------
  const categories = [
    { id: 1, icon: <FaCar />, name: "Cars" },
    { id: 2, icon: <FaMobileAlt />, name: "Mobiles" },
    { id: 3, icon: <FaBicycle />, name: "Bikes" },
    { id: 4, icon: <FaTv />, name: "Electronics & Appliances" },
    { id: 5, icon: <FaCouch />, name: "Furniture and Decor" },
    { id: 6, icon: <FaTshirt />, name: "Fashion" },
    { id: 7, icon: <FaBook />, name: "Books, Sports & Hobbies" },
    { id: 8, icon: <FaDog />, name: "Pets" },
  ];

  const electronicsSubcategories = [
    "TVs, Video - Audio",
    "Computers & Laptops",
    "Fridges",
    "ACs",
    "Washing Machines",
    "Cameras & Lenses",
  ];
  const mobileSubcategories = ["Mobile Phones", "Tablets"];
  const fashionSubcategories = ["Men", "Women", "Kids"];
  const fashionNestedSubcategories = {
    Men: ["Clothing", "Accessories"],
    Women: ["Clothing", "Accessories"],
    Kids: ["Clothing", "Accessories"],
  };
  const booksSportsHobbiesSubcategories = ["Books", "Sports", "Hobbies"];

  // -------------------
  // Handle Form Submit
  // -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    let attributes = {};
    let categoryId = selectedCategory;

    // Example: Cars attributes
    if (selectedCategory === 1) {
      attributes = {
        model: formData.model || "",
        brand: formData.brand || "",
        year: formData.year || "",
        kmDriven: formData.kmDriven || "",
        fuel: fuel || "",
        transmission: transmission || "",
        owner: owner || "",
      };
    }

    // You can continue defining attributes for other categories like Mobiles, Bikes, Fashion, etc.

    const productData = {
      title: formData.title || "",
      description: formData.description || "",
      price: formData.price || "",
      categoryId: String(categoryId ?? ""),
      photos: photos.filter((p) => p !== null),
      attributes,
      seller: userId,
      city: formData.city,
      state: formData.state,
      locationMode: formData.locationMode,
      manualLocation:
        formData.locationMode === "manual" ? formData.manualLocation : { address: "", pincode: "" },
      gpsLocation:
        formData.locationMode === "gps" ? formData.gpsLocation : { type: "Point", coordinates: [0, 0] },
    };

    try {
      const res = await fetch("http://localhost:5000/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Ad posted successfully!");
        console.log("Inserted Product:", data);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error("Error posting ad:", err);
      alert("Something went wrong!");
    }
  };

  // -------------------
  // Render Common Fields
  // -------------------
  const renderCommonFields = () => (
    <>
      <input
        type="text"
        name="title"
        placeholder="Ad Title"
        value={formData.title || ""}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description || ""}
        onChange={handleChange}
        required
      />
      <input
        type="number"
        name="price"
        placeholder="Price (₹)"
        value={formData.price || ""}
        onChange={handleChange}
        required
      />
    </>
  );

  // -------------------
  // Render Form
  // -------------------
  const renderForm = () => (
    <div className="form-container">
      <button
        className="back-arrow"
        onClick={() => setSelectedCategory(null)}
      >
        ←
      </button>
      <form className="category-form" onSubmit={handleSubmit}>
        <h3>Post an Ad</h3>
        {renderCommonFields()}
        <h4>Upload up to 20 Photos</h4>
        {renderPhotoGrid()}
        {renderLocation()}

        <button type="submit" className="submit-btn">
          Post Ad
        </button>
      </form>
    </div>
  );

  // -------------------
  // Main Render
  // -------------------
  return (
    <div className="sell-container">
      <h2 className="sell-title">POST YOUR AD</h2>
      <div className="sell-box">
        {!selectedCategory ? (
          <>
            <h6 className="category-heading">CHOOSE A CATEGORY</h6>
            <ul className="category-list">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="category-item"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory("");
                  }}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-name">{cat.name}</span>
                  <span className="category-arrow">›</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          renderForm()
        )}
      </div>
    </div>
  );
}

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

// Main Sell Component
export default function Sell() {
  // ------------------- // State Variables // -------------------
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [photos, setPhotos] = useState(Array(20).fill(null));
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [owner, setOwner] = useState("");
  const [userId, setUserId] = useState(null);
  const [showLocationForm, setShowLocationForm] = useState(false);

  const auth = getAuth();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // -------------------- State --------------------
const [formData, setFormData] = useState({
  city: "",
  state: "",
  locationMode: "",
  manualLocation: { address: "", pincode: "" },
  gpsLocation: { type: "Point", coordinates: [0, 0] },
});

// -------------------- Fetch user data --------------------
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      fetch(`http://localhost:5000/api/users/getId/${currentUser.uid}`)
        .then((res) => {
          if (!res.ok) throw new Error("User fetch failed");
          return res.json();
        })
        .then((data) => {
          const updatedFormData = {
            city: data.city || "",
            state: data.state || "",
            locationMode: data.locationMode || "",
            manualLocation: data.manualLocation || { address: "", pincode: "" },
            gpsLocation: data.gpsLocation || { type: "Point", coordinates: [0, 0] },
          };

          setFormData(updatedFormData);

          // -------------------- Check for missing default location --------------------
          const missingManualFields =
            !updatedFormData.city ||
            !updatedFormData.state ||
            (updatedFormData.locationMode === "manual" &&
              (!updatedFormData.manualLocation.address || !updatedFormData.manualLocation.pincode));

          const missingGPS =
            updatedFormData.locationMode === "gps" &&
            updatedFormData.gpsLocation.coordinates[0] === 0 &&
            updatedFormData.gpsLocation.coordinates[1] === 0;

          if (!updatedFormData.locationMode || missingManualFields || missingGPS) {
            setIsChangingLocation(true); // Force user to enter missing fields
            setLocationConfirmed(false);
          } else {
            setLocationConfirmed(true);
          }
        })
        .catch((err) => console.error("Error fetching user data:", err));
    }
  });
  return () => unsubscribe();
}, [auth]);


// -------------------- Handlers --------------------
const handleLocationFieldChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};

const handleManualLocationChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    manualLocation: { ...prev.manualLocation, [name]: value },
  }));
};

const handleGetGPS = () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;

      if (latitude === 0 && longitude === 0) {
        alert("Unable to fetch GPS coordinates. Please try again.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        locationMode: "gps",
        gpsLocation: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      }));

      alert(`GPS location captured!\nLat: ${latitude}, Lng: ${longitude}`);
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          alert("Permission denied. Please allow location access.");
          break;
        case error.POSITION_UNAVAILABLE:
          alert("Position unavailable. Please try again later.");
          break;
        case error.TIMEOUT:
          alert("GPS request timed out. Please try again.");
          break;
        default:
          alert("An unknown error occurred while fetching GPS location.");
          break;
      }
      console.error("Geolocation error:", error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
};


// -------------------- Confirm Location --------------------
const handleConfirmLocation = () => {
  const { city, state, locationMode, manualLocation, gpsLocation } = formData;

  if (!locationMode) {
    alert("Please choose Manual or GPS location before confirming.");
    setIsChangingLocation(true);
    return;
  }

  if (locationMode === "manual") {
    if (!city || !state || !manualLocation.address || !manualLocation.pincode) {
      alert("Please fill in full manual address before confirming.");
      setIsChangingLocation(true);
      return;
    }
  }

  if (locationMode === "gps") {
    const [lng, lat] = gpsLocation.coordinates;
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      alert("Please capture your GPS location before confirming.");
      setIsChangingLocation(true);
      return;
    }
  }

  setLocationConfirmed(true);
  setIsChangingLocation(false);
  alert(`Location confirmed!\nMode: ${locationMode}`);
};

// -------------------- Render Location --------------------
function renderLocation(formData) {
  if (!formData) return <p>Loading location...</p>;

  if (isChangingLocation) {
    return (
      <div className="location-form">
        <h3>Update Location</h3>

        {/* Show city/state only if not GPS */}
        {formData.locationMode !== "gps" && (
          <>
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
          </>
        )}

        <div>
          <label>
            <input
              type="radio"
              checked={formData.locationMode === "manual"}
              onChange={() =>
                setFormData((prev) => ({ ...prev, locationMode: "manual" }))
              }
            />{" "}
            Manual
          </label>
          <label>
            <input
              type="radio"
              checked={formData.locationMode === "gps"}
              onChange={() =>
                setFormData((prev) => ({ ...prev, locationMode: "gps" }))
              }
            />{" "}
            GPS
          </label>
        </div>

        {/* Manual fields */}
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

        {/* GPS */}
        {formData.locationMode === "gps" && (
          <>
            <button type="button" onClick={handleGetGPS}>
              Get GPS Location
            </button>
            {formData.gpsLocation.coordinates[0] !== 0 && (
              <p>
                Lat: {formData.gpsLocation.coordinates[1]}, Lng: {formData.gpsLocation.coordinates[0]}
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

  // -------------------- Confirmed Location --------------------
  return (
    <div className="confirmed-location">
      <h4>Location:</h4>

      {/* Show city/state only if not GPS */}
      {formData.locationMode !== "gps" && (
        <>
          <p>City: {formData.city || "Not set"}</p>
          <p>State: {formData.state || "Not set"}</p>
        </>
      )}

      {/* Show manual address or GPS */}
      {formData.locationMode === "manual" ? (
        <>
          <p>Address: {formData.manualLocation.address || "Not set"}</p>
          <p>Pincode: {formData.manualLocation.pincode || "Not set"}</p>
        </>
      ) : formData.locationMode === "gps" ? (
        <p>
          GPS: {formData.gpsLocation.coordinates[1] || "-"}, {formData.gpsLocation.coordinates[0] || "-"}
        </p>
      ) : (
        <p>
          You haven't confirmed full location. Please{" "}
          <button type="button" onClick={() => setIsChangingLocation(true)}>
            add address manually or use GPS
          </button>
        </p>
      )}

      <button type="button" onClick={() => setIsChangingLocation(true)}>
        Change Location
      </button>
    </div>
  );
}

// ------------------- // Validation Helpers // -------------------
const validateYear = (year, label = "Year") => {
  const currentYear = new Date().getFullYear();

  if (!year) return `${label} is required.`;
  if (!/^\d{4}$/.test(year)) return `${label} must be a 4-digit number.`;
  if (year < 1990 || year > currentYear + 1)
    return `${label} must be between 1900 and ${currentYear + 1}.`;

  return null;
};

const validateForm = () => {
  const errors = [];

  // Common fields
  if (!formData.title) errors.push("Title is required.");
  if (!formData.description) errors.push("Description is required.");
  if (!formData.price || formData.price <= 0)
    errors.push("Price must be greater than 0.");

  // Category-specific validation
  if (selectedCategory === 1) {
    // Cars
    if (!formData.brand) errors.push("Car brand is required.");
    if (!formData.model) errors.push("Car model is required.");
    const yearError = validateYear(formData.year, "Car year");
    if (yearError) errors.push(yearError);
    if (!fuel) errors.push("Fuel type is required.");
    if (!transmission) errors.push("Transmission type is required.");
    if (!formData.kmDriven) errors.push("KM driven is required.");
    if (!owner) errors.push("Number of owners is required.");
  }

  if (selectedCategory === 2) {
    // Mobiles
    if (selectedSubcategory === "Mobile Phones") {
      if (!formData.brand) errors.push("Mobile brand is required.");
      const yearError = validateYear(formData.year, "Mobile year");
      if (yearError) errors.push(yearError);
    }
    if (selectedSubcategory === "Tablets") {
      if (!formData.tabletType) errors.push("Tablet type is required.");
      const yearError = validateYear(formData.year, "Tablet year");
      if (yearError) errors.push(yearError);
    }
  }

  if (selectedCategory === 3) {
    // Bikes
    if (!formData.brand) errors.push("Bike brand is required.");
    if (!formData.model) errors.push("Bike model is required.");
    const yearError = validateYear(formData.year, "Bike year");
    if (yearError) errors.push(yearError);
    if (!formData.kmDriven) errors.push("Bike KM driven is required.");
    if (!formData.vehicleType) errors.push("Bike vehicle type is required.");
  }

  if (selectedCategory === 4) {
    // Electronics
    if (!formData.brand) errors.push("Electronics brand is required.");
    if (!formData.model) errors.push("Electronics model is required.");
    const yearError = validateYear(formData.year, "Electronics year");
    if (yearError) errors.push(yearError);
  }

  if (selectedCategory === 5) {
    // Furniture
    if (!formData.brand) errors.push("Furniture brand is required.");
    if (!formData.model) errors.push("Furniture model is required.");
    const yearError = validateYear(formData.year, "Furniture year");
    if (yearError) errors.push(yearError);
  }

  if (selectedCategory === 6) {
    // Fashion
    if (!formData.brand) errors.push("Fashion brand is required.");
    const yearError = validateYear(formData.year, "Fashion year");
    if (yearError) errors.push(yearError);
    if (!formData.size) errors.push("Fashion size is required.");
  }

  if (selectedCategory === 7) {
    // Books, Sports, Hobbies
    const yearError = validateYear(formData.year, "Year");
    if (yearError) errors.push(yearError);
    if (!formData.condition) errors.push("Condition is required.");
  }

  if (selectedCategory === 8) {
    // Pets
    const yearError = validateYear(formData.year, "Pet year");
    if (yearError) errors.push(yearError);
    if (!formData.type) errors.push("Pet type is required.");
  }

  return errors;
};




  // ------------------- // Subcategories // -------------------
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
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
  // ------------------- // Categories List // -------------------
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
  // ------------------- // Handle Input Change // -------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // ------------------- // Handle Photo Upload // -------------------
  const handlePhotoChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const newPhotos = [...photos];
      newPhotos[index] = URL.createObjectURL(file);
      setPhotos(newPhotos);
    }
  };
  // ------------------- // Render Photo Grid // -------------------
  const renderPhotoGrid = () => (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <label key={index} className="photo-box">
          {photo ? (
            <img src={photo} alt={`upload-${index}`} />
          ) : (
            <span className="plus">+</span>
          )}
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

  // ------------------- // Submit Form // -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
  if (errors.length > 0) {
    alert("Please fix the following errors:\n" + errors.join("\n"));
    return;
  }
    const {
      title,
      description,
      price,
      city,
      state,
      locationMode,
      manualLocation,
      gpsLocation,
    } = formData;
    // Attributes per category
    let attributes = {};
    if (selectedCategory === 1) {
      // Cars
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

    if (selectedCategory === 2) {
      // Mobiles
      if (selectedSubcategory === "Mobile Phones") {
        attributes = {
          year: formData.year || "",
          brand: formData.brand || "",
        };
      }

      if (selectedSubcategory === "Tablets") {
        attributes = {
          tabletType: formData.tabletType || "",
          year: formData.year || "",
        };
      }
    }

    if (selectedCategory === 3) {
      // Bikes
      attributes = {
        brand: formData.brand || "",
        model: formData.model || "",
        year: formData.year || "",
        kmDriven: formData.kmDriven || "",
        vehicleType: formData.vehicleType || "",
      };
    }

    if (selectedCategory === 4) {
      // Electronics & Appliances
      attributes = {
        brand: formData.brand || "",
        model: formData.model || "",
        year: formData.year || "",
      };
    }

    if (selectedCategory === 5) {
      // Furniture & Decor
      attributes = {
        brand: formData.brand || "",
        model: formData.model || "",
        year: formData.year || "",
      };
    }

    if (selectedCategory === 8) {
      attributes = {
        year: formData.year || "",
        type: formData.type || "",
      };
    }

    // ------------------- // Category ID override for Mobiles // -------------------

    let categoryId = selectedCategory;
    if (selectedCategory === 2 && selectedSubcategory === "Mobile Phones") {
      categoryId = 201;
    }

    if (selectedCategory === 2 && selectedSubcategory === "Tablets") {
      categoryId = 202;
    }

    if (selectedCategory === 4) {
      if (selectedSubcategory === "TVs, Video - Audio") categoryId = 401;
      if (selectedSubcategory === "Computers & Laptops") categoryId = 402;
      if (selectedSubcategory === "Cameras & Lenses") categoryId = 403;
      if (selectedSubcategory === "Fridges") categoryId = 405;
      if (selectedSubcategory === "Washing Machines") categoryId = 406;
    }

    if (selectedCategory === 6) {
      if (
        selectedSubcategory === "Women" &&
        formData.fashionType === "Clothing"
      )
        categoryId = 601;
      if (
        selectedSubcategory === "Women" &&
        formData.fashionType === "Accessories"
      )
        categoryId = 602;
      if (selectedSubcategory === "Men" && formData.fashionType === "Clothing")
        categoryId = 603;
      if (
        selectedSubcategory === "Men" &&
        formData.fashionType === "Accessories"
      )
        categoryId = 604;
      if (selectedSubcategory === "Kids" && formData.fashionType === "Clothing")
        categoryId = 605;
      if (
        selectedSubcategory === "Kids" &&
        formData.fashionType === "Accessories"
      )
        categoryId = 606;
    }

    if (selectedCategory === 7) {
      if (selectedSubcategory === "Books") categoryId = 701;
      if (selectedSubcategory === "Sports") categoryId = 702;
      if (selectedSubcategory === "Hobbies") categoryId = 703;

      attributes = {
        year: formData.year || "",
        condition: formData.condition || "",
      };
    }

    if (selectedCategory === 6) {
      // Fashion
      attributes = {
        brand: formData.brand || "",
        year: formData.year || "",
        size: formData.size || "",
      };
    }

    const productData = {
      title: title || "",
      description: description || "",
      price: price ?? 0,
      categoryId: categoryId ?? 0,
      photos: photos.filter((p) => p !== null),
      attributes,
      seller: userId,
      city: formData.city,
      state: formData.state,
      locationMode: formData.locationMode,
      manualLocation:
        formData.locationMode === "manual"
          ? formData.manualLocation
          : { address: "", pincode: "" },
      gpsLocation:
        formData.locationMode === "gps"
          ? formData.gpsLocation
          : { type: "Point", coordinates: [0, 0] },
    };

    console.log("Submitting productData:", productData);
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

  // ------------------- // Common Fields // -------------------
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
      ></textarea>

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
  const renderBooksSportsHobbiesForm = () => {
    // Step 1: Subcategory selection
    if (!selectedSubcategory) {
      return (
        <div className="form-container">
          {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedCategory(null)}
          >
            {" "}
            ←{" "}
          </button>{" "}
          <div className="subcategory-grid">
            {" "}
            {["Books", "Sports", "Hobbies"].map((sub) => (
              <div
                key={sub}
                className="subcategory-card"
                onClick={() => setSelectedSubcategory(sub)}
              >
                {" "}
                <span className="subcategory-name">{sub}</span>{" "}
                <span className="subcategory-arrow">›</span>{" "}
              </div>
            ))}
          </div>{" "}
        </div>
      );
    }
    // Step 2: Detailed form after choosing a subcategory
    return (
      <div className="form-container">
        {" "}
        <button
          className="back-arrow"
          onClick={() => setSelectedSubcategory("")}
        >
          {" "}
          ←{" "}
        </button>{" "}
        <form className="category-form" onSubmit={handleSubmit}>
          {" "}
          <h3 className="form-heading">
            {selectedSubcategory}
            Details
          </h3>{" "}
          {renderCommonFields()}
          <label>Year *</label>{" "}
          <input
            type="number"
            name="year"
            placeholder="Enter Year"
            value={formData.year || ""}
            onChange={handleChange}
            required
          />{" "}
          <label>Condition *</label>{" "}
          <select
            name="condition"
            value={formData.condition || ""}
            onChange={handleChange}
            required
          >
            {" "}
            <option value="">Select Condition</option>{" "}
            <option value="New">New</option>{" "}
            <option value="Like New">Like New</option>{" "}
            <option value="Used">Used</option> <option value="Old">Old</option>{" "}
          </select>{" "}
          <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
          {renderLocation(formData)}
          <button type="submit" className="submit-btn">
            {" "}
            Post Ad{" "}
          </button>{" "}
        </form>{" "}
      </div>
    );
  };
  const renderPetsForm = () => {
    return (
      <div className="form-container">
        {" "}
        <button
          className="back-arrow"
          onClick={() => setSelectedCategory(null)}
        >
          {" "}
          ←{" "}
        </button>{" "}
        <form className="category-form" onSubmit={handleSubmit}>
          {" "}
          <h3 className="form-heading">Pets Details</h3> {renderCommonFields()}
          <label>Year *</label>{" "}
          <input
            type="number"
            name="year"
            placeholder="Enter Year"
            value={formData.year || ""}
            onChange={handleChange}
            required
          />{" "}
          <label>Type *</label>{" "}
          <select
            name="type"
            value={formData.type || ""}
            onChange={handleChange}
            required
          >
            {" "}
            <option value="">Select Type</option>{" "}
            <option value="Dog">Dog</option> <option value="Cat">Cat</option>{" "}
            <option value="Bird">Bird</option>{" "}
            <option value="Fish">Fish</option>{" "}
            <option value="Other">Other</option>{" "}
          </select>{" "}
          <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
          {renderLocation(formData)}
          <button type="submit" className="submit-btn">
            {" "}
            Post Ad{" "}
          </button>{" "}
        </form>{" "}
      </div>
    );
  };
  // ------------------- // Electronics Form // -------------------
  const renderElectronicsForm = () => {
    if (!selectedSubcategory) {
      return (
        <div className="subcategory-grid">
          {" "}
          {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedCategory(null)}
          >
            {" "}
            ←{" "}
          </button>{" "}
          {electronicsSubcategories.map((sub) => (
            
            <div
              key={sub}
              className="subcategory-card"
              onClick={() => setSelectedSubcategory(sub)}
            >
          
              <span className="subcategory-name">{sub}</span>{" "}
              <span className="subcategory-arrow">›</span>{" "}
            </div>
          ))}
        </div>
      );
    }

    return (
      <form className="category-form" onSubmit={handleSubmit}>
        {" "}
        {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedCategory(null)}
          >
            {" "}
            ←{" "}
          </button>{" "}
        <h3 className="form-heading">
          {selectedSubcategory}
          Details
        </h3>{" "}{renderCommonFields()}{" "}
        {" "}
        <label>Brand *</label>{" "}
        <input
          type="text"
          name="brand"
          placeholder="Enter Brand"
          value={formData.brand || ""}
          onChange={handleChange}
          required
        />{" "}
        <label>Model *</label>{" "}
        <input
          type="text"
          name="model"
          placeholder="Enter Model"
          value={formData.model || ""}
          onChange={handleChange}
          required
        />{" "}
        <label>Year *</label>{" "}
        <input
          type="number"
          name="year"
          placeholder="Enter Year"
          value={formData.year || ""}
          onChange={handleChange}
          required
        />{" "}
        {renderCommonFields()}
        <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
        {renderLocation(formData)}
        <button type="submit" className="submit-btn">
          {" "}
          Post Ad{" "}
        </button>{" "}
      </form>
    );
  };
  // ------------------- // Mobile Form // -------------------
  const renderMobileForm = () => {
    if (!selectedSubcategory) {
      return (
        <div className="form-container">
          {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedCategory(null)}
          >
            {" "}
            ←{" "}
          </button>{" "}
          <div className="subcategory-grid">
            {" "}
            {mobileSubcategories.map((sub) => (
              <div
                key={sub}
                className="subcategory-card"
                onClick={() => setSelectedSubcategory(sub)}
              >
                {" "}
                <span className="subcategory-name">{sub}</span>{" "}
                <span className="subcategory-arrow">›</span>{" "}
              </div>
            ))}
          </div>{" "}
        </div>
      );
    }

    return (
      <div className="form-container">
        {" "}
        <button
          className="back-arrow"
          onClick={() => setSelectedSubcategory("")}
        >
          {" "}
          ←{" "}
        </button>{" "}
        <form className="category-form" onSubmit={handleSubmit}>
          {" "}
          <h3 className="form-heading">
            {selectedSubcategory}
            Details
          </h3>{" "}
          {selectedSubcategory === "Mobile Phones" && (
            <>
             {" "}{renderCommonFields()}{" "}
              {" "}
              <input
                type="text"
                name="brand"
                placeholder="Brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Year *</label>{" "}
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />{" "}
            </>
          )}
          {selectedSubcategory === "Tablets" && (
            <>
              {" "}{renderCommonFields()}{" "}
              {" "}  <label>Tablet Type *</label>{" "}
              <div className="button-group">
                {" "}
                {["Samsung", "iPad", "Other"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={formData.tabletType === t ? "active" : ""}
                    onClick={() => setFormData({ ...formData, tabletType: t })}
                  >
                    {" "}
                    {t}
                  </button>
                ))}
              </div>{" "}
              <label>Year *</label>{" "}
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />{" "}
            </>
          )}
          
          <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
          {renderLocation(formData)}
          <button type="submit" className="submit-btn">
            {" "}
            Post Ad{" "}
          </button>{" "}
        </form>{" "}
      </div>
    );
  };
  // ------------------- // Fashion Form // -------------------
  const renderFashionForm = () => {
    // First level: Men/Women/Kids
    if (!selectedSubcategory) {
      return (
        <div className="form-container">
          {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedCategory(null)}
          >
            {" "}
            ←{" "}
          </button>{" "}
          <div className="subcategory-grid">
            {" "}
            {fashionSubcategories.map((sub) => (
              <div
                key={sub}
                className="subcategory-card"
                onClick={() => setSelectedSubcategory(sub)}
              >
                {" "}
                <span className="subcategory-name">{sub}</span>{" "}
                <span className="subcategory-arrow">›</span>{" "}
              </div>
            ))}
          </div>{" "}
        </div>
      );
    }
    // Second level: Clothing / Accessories
    if (selectedSubcategory && !formData.fashionType) {
      return (
        <div className="form-container">
          {" "}
          <button
            className="back-arrow"
            onClick={() => setSelectedSubcategory("")}
          >
            {" "}
            ←{" "}
          </button>{" "}
          <div className="subcategory-grid">
            {" "}
            {fashionNestedSubcategories[selectedSubcategory].map((nested) => (
              <div
                key={nested}
                className="subcategory-card"
                onClick={() =>
                  setFormData({ ...formData, fashionType: nested })
                }
              >
                {" "}
                <span className="subcategory-name">{nested}</span>{" "}
                <span className="subcategory-arrow">›</span>{" "}
              </div>
            ))}
          </div>{" "}
        </div>
      );
    }
    // Final form after Clothing / Accessories selection
    return (
      <div className="form-container">
        {" "}
        <button
          className="back-arrow"
          onClick={() => setFormData({ ...formData, fashionType: "" })}
        >
          {" "}
          ←{" "}
        </button>{" "}
        <form className="category-form" onSubmit={handleSubmit}>
          {" "}
          <h3 className="form-heading">
            {" "}
            {selectedSubcategory}- {formData.fashionType}
            Details{" "}
          </h3>{" "}
          {renderCommonFields()}
          <label>Brand *</label>{" "}
          <input
            type="text"
            name="brand"
            placeholder="Enter Brand"
            value={formData.brand || ""}
            onChange={handleChange}
            required
          />{" "}
          <label>Year *</label>{" "}
          <input
            type="number"
            name="year"
            placeholder="Enter Year"
            value={formData.year || ""}
            onChange={handleChange}
            required
          />{" "}
          <label>Size *</label>{" "}
          <input
            type="text"
            name="size"
            placeholder="Enter Size"
            value={formData.size || ""}
            onChange={handleChange}
            required
          />{" "}
          <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
          {renderLocation(formData)}
          <button type="submit" className="submit-btn">
            {" "}
            Post Ad{" "}
          </button>{" "}
        </form>{" "}
      </div>
    );
  };
  // ------------------- // Render Category Form // -------------------
  const renderForm = () => {
    const selectedCatObj = categories.find(
      (cat) => cat.id === selectedCategory
    );
    if (selectedCategory === 2) return renderMobileForm();
    if (selectedCategory === 6) return renderFashionForm();
    if (selectedCategory === 4) return renderElectronicsForm();
    if (selectedCategory === 7) return renderBooksSportsHobbiesForm();
    if (selectedCategory === 8) return renderPetsForm();
    return (
      <div className="form-container">
        {" "}
        <button
          className="back-arrow"
          onClick={() =>
            selectedSubcategory
              ? setSelectedSubcategory("")
              : setSelectedCategory(null)
          }
        >
          {" "}
          ←{" "}
        </button>{" "}
        <form className="category-form" onSubmit={handleSubmit}>
          {" "}
          <h3>Post an Ad for {selectedCatObj?.name}</h3> {renderCommonFields()}
          {/* Cars */}
          {selectedCategory === 5 && (
            <>
              {" "}
              <label>Brand *</label>{" "}
              <input
                type="text"
                name="brand"
                placeholder="Enter Brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Model *</label>{" "}
              <input
                type="text"
                name="model"
                placeholder="Enter Model"
                value={formData.model || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Year *</label>{" "}
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />{" "}
            </>
          )}
          {selectedCategory === 1 && (
            <>
              {" "}
              <label>Brand *</label>{" "}
              <select
                name="brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              >
                {" "}
                <option value="">Select Brand</option>{" "}
                <option value="Maruti">Maruti</option>{" "}
                <option value="Hyundai">Hyundai</option>{" "}
                <option value="Tata">Tata</option>{" "}
                <option value="Honda">Honda</option>{" "}
                <option value="Mahindra">Mahindra</option>{" "}
              </select>{" "}
              <label>Model *</label>{" "}
              <input
                type="text"
                name="model"
                placeholder="Model"
                value={formData.model || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Year *</label>{" "}
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Fuel *</label>{" "}
              <div className="button-group">
                {" "}
                {["Petrol", "Diesel", "CNG & Hybrids", "Electric", "LPG"].map(
                  (f) => (
                    <button
                      type="button"
                      key={f}
                      className={fuel === f ? "active" : ""}
                      onClick={() => setFuel(f)}
                    >
                      {" "}
                      {f}
                    </button>
                  )
                )}
              </div>{" "}
              <label>Transmission *</label>{" "}
              <div className="button-group">
                {" "}
                {["Automatic", "Manual"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={transmission === t ? "active" : ""}
                    onClick={() => setTransmission(t)}
                  >
                    {" "}
                    {t}
                  </button>
                ))}
              </div>{" "}
              <label>KM driven *</label>{" "}
              <input
                type="number"
                name="kmDriven"
                placeholder="Enter KM Driven"
                value={formData.kmDriven || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>No. of Owners *</label>{" "}
              <div className="button-group">
                {" "}
                {["1st", "2nd", "3rd", "4th", "4+"].map((o) => (
                  <button
                    type="button"
                    key={o}
                    className={owner === o ? "active" : ""}
                    onClick={() => setOwner(o)}
                  >
                    {" "}
                    {o}
                  </button>
                ))}
              </div>{" "}
            </>
          )}
          {/* Bikes */}
          {selectedCategory === 3 && (
            <>
              {" "}
              <label>Brand *</label>{" "}
              <input
                type="text"
                name="brand"
                placeholder="Enter Brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Model *</label>{" "}
              <input
                type="text"
                name="model"
                placeholder="Enter Model"
                value={formData.model || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>Vehicle Type *</label>{" "}
              <div className="button-group">
                {" "}
                {["Petrol", "EV"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={formData.vehicleType === t ? "active" : ""}
                    onClick={() => setFormData({ ...formData, vehicleType: t })}
                  >
                    {" "}
                    {t}
                  </button>
                ))}
              </div>{" "}
              <label>Year *</label>{" "}
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />{" "}
              <label>KM Driven *</label>{" "}
              <input
                type="number"
                name="kmDriven"
                placeholder="Enter KM Driven"
                value={formData.kmDriven || ""}
                onChange={handleChange}
                required
              />{" "}
            </>
          )}
          <h4>Upload up to 20 Photos</h4> {renderPhotoGrid()}
          {renderLocation(formData)}
          <button type="submit" className="submit-btn">
            {" "}
            Post Ad{" "}
          </button>{" "}
        </form>{" "}
      </div>
    );
  };
  // ------------------- // Main Render // -------------------
  return (
    <div className="sell-container">
      {" "}
      <h2 className="sell-title">POST YOUR AD</h2>{" "}
      <div className="sell-box">
        {" "}
        {!selectedCategory ? (
          <>
            {" "}
            <h6 className="category-heading">CHOOSE A CATEGORY</h6>{" "}
            <ul className="category-list">
              {" "}
              {categories.map((cat, index) => (
                <li
                  key={index}
                  className="category-item"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory("");
                  }}
                >
                  {" "}
                  <span className="category-icon">{cat.icon}</span>{" "}
                  <span className="category-name">{cat.name}</span>{" "}
                  <span className="category-arrow">›</span>{" "}
                </li>
              ))}
            </ul>{" "}
          </>
        ) : (
          renderForm()
        )}
      </div>{" "}
    </div>
  );
}

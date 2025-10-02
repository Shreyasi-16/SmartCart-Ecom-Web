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

const CLOUDINARY_CLOUD_NAME = "dzvfekrgb"; // from your Cloudinary dashboard
const CLOUDINARY_UPLOAD_PRESET = "j_default"; // your unsigned upload preset

// Main Sell Component

export default function Sell() {
  // ------------------- // State Variables // -------------------
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [photos, setPhotos] = useState(Array(20).fill(null));
  const [uploading, setUploading] = useState(Array(20).fill(false)); // NEW: Tracks upload status
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [owner, setOwner] = useState("");
  const [userId, setUserId] = useState(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [fetchedGPS, setFetchedGPS] = useState({ lat: 0, lng: 0 });
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

  //location
  const [formData, setFormData] = useState({
    city: "",
    state: "",
    locationMode: "",
    manualLocation: { address: "", pincode: "" },
    gpsLocation: { type: "Point", coordinates: [0, 0] },
  });

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
            const hasManual = data.locationMode === "manual";
            const manualIncomplete =
              hasManual &&
              (!data.city ||
                !data.state ||
                !data.manualLocation?.address ||
                !data.manualLocation?.pincode);

            const gpsIncomplete =
              data.locationMode === "gps" &&
              (!data.gpsLocation || data.gpsLocation.coordinates[0] === 0);

            const noLocationMode = !data.locationMode;

            setFormData({
              city: data.city || "",
              state: data.state || "",
              locationMode:
                data.locationMode ||
                (manualIncomplete || noLocationMode ? "manual" : "gps"),
              manualLocation: data.manualLocation || {
                address: "",
                pincode: "",
              },
              gpsLocation: data.gpsLocation || {
                type: "Point",
                coordinates: [0, 0],
              },
            });

            // If any location info missing → force open location form
            if (manualIncomplete || gpsIncomplete || noLocationMode) {
              setIsChangingLocation(true);
              setLocationConfirmed(false);
            } else {
              setLocationConfirmed(true);
            }
          })
          .catch((err) => {
            console.error("Error fetching user:", err);
            // fallback: open location form if fetch fails
            setIsChangingLocation(true);
            setLocationConfirmed(false);
          });
      } else {
        // if no logged-in user → reset location
        setFormData({
          city: "",
          state: "",
          locationMode: "manual", // default to manual for safety
          manualLocation: { address: "", pincode: "" },
          gpsLocation: { type: "Point", coordinates: [0, 0] },
        });
        setIsChangingLocation(true);
        setLocationConfirmed(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Simple reverse geocoding using OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
  try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { "User-Agent": "SmartCart-App" } });
      const data = await res.json();
  
      let city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.municipality ||
        data.address.county ||
        "";
      let state = data.address.state || "";
  
      return { city, state };
    } catch (err) {
      console.error("Geocoding error:", err);
      return { city: "", state: "" };
    }
};

  // ----------------- Handle text field change -----------------
  const handleLocationFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ----------------- Handle manual subfields -----------------
  const handleManualLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      manualLocation: { ...prev.manualLocation, [name]: value },
    }));
  };

  // ----------------- GPS Fetch -----------------
  const handleGetGPS = async () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Reverse geocode to get city/state
      const location = await reverseGeocode(lat, lng);

      // Update state
      setFormData((prev) => ({
        ...prev,
        locationMode: "gps",
        gpsLocation: { type: "Point", coordinates: [lng, lat] },
        city: location.city,
        state: location.state,
      }));

      setFetchedGPS({ lat, lng });
      alert(`GPS captured! City: ${location.city}, State: ${location.state}`);

      // Save to backend
      if (user) {
        try {
          const res = await fetch(`http://localhost:5000/api/users/updateLocation/${user.uid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locationMode: "gps",
              gpsLocation: { type: "Point", coordinates: [lng, lat] },
              city: location.city,
              state: location.state,
            }),
          });

          if (!res.ok) throw new Error("Failed to save location to DB");
          console.log("Location saved successfully!");
        } catch (err) {
          console.error("Error saving location:", err);
        }
      }
    },
    (err) => {
      console.error(err);
      alert("Failed to fetch GPS location.");
    }
  );
};

  // ----------------- Validation -----------------
  const validateLocation = () => {
    if (!formData.locationMode) {
      alert("Please select a location mode (Manual or GPS).");
      return false;
    }

    if (formData.locationMode === "manual") {
      if (
        !formData.city.trim() ||
        !formData.state.trim() ||
        !formData.manualLocation.address.trim() ||
        !formData.manualLocation.pincode.trim()
      ) {
        alert("Please fill all manual location fields.");
        return false;
      }
    }

    if (formData.locationMode === "gps") {
      if (
        !formData.gpsLocation.coordinates ||
        formData.gpsLocation.coordinates[0] === 0
      ) {
        alert("Please fetch GPS location before confirming.");
        return false;
      }
    }

    return true;
  };

  // ----------------- Confirm -----------------
  const handleConfirmLocation = () => {
    if (!validateLocation()) return;

    setLocationConfirmed(true);
    setIsChangingLocation(false);
    alert(`Location confirmed!\nMode: ${formData.locationMode}`);
  };

  // ----------------- UI Render -----------------
  function renderLocation(formData) {
    if (!formData) return <p>Loading location...</p>;

    if (isChangingLocation) {
      return (
        <div className="location-form">
          <h3>Update Location</h3>

          {/* Radio buttons */}
          <div>
            <label>
              <input
                type="radio"
                checked={formData.locationMode === "manual"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, locationMode: "manual" }))
                }
              />
              Manual
            </label>
            <label>
              <input
                type="radio"
                checked={formData.locationMode === "gps"}
                onChange={() => {
                  setFormData((prev) => ({
                    ...prev,
                    locationMode: "gps",
                    gpsLocation: { type: "Point", coordinates: [0, 0] }, // reset saved coords
                  }));
                  setFetchedGPS({ lat: 0, lng: 0 });
                }}
              />
              GPS
            </label>
          </div>

          {/* Manual Mode */}
          {formData.locationMode === "manual" && (
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

          {/* GPS Mode */}
          {/* GPS Mode */}
          {formData.locationMode === "gps" && (
            <>
              {/* Always force Get GPS until user fetches in this session */}
              {fetchedGPS.lat === 0 && fetchedGPS.lng === 0 ? (
                <button type="button" onClick={handleGetGPS}>
                  Get GPS Location
                </button>
              ) : (
                <div>
                  <p>Latitude: {fetchedGPS.lat}</p>
                  <p>Longitude: {fetchedGPS.lng}</p>
                </div>
              )}
            </>
          )}

          <button type="button" onClick={handleConfirmLocation}>
            Confirm Location
          </button>
        </div>
      );
    }

    // Default confirmed location
    return (
      <div className="confirmed-location">
        <h4>Location:</h4>
        {formData.locationMode === "manual" ? (
          <>
            <p>City: {formData.city}</p>
            <p>State: {formData.state}</p>
            <p>Address: {formData.manualLocation.address}</p>
            <p>Pincode: {formData.manualLocation.pincode}</p>
          </>
        ) : (
          <>
            <p>GPS:</p>
            <p>Latitude: {formData.gpsLocation.coordinates[1]}</p>
            <p>Longitude: {formData.gpsLocation.coordinates[0]}</p>
          </>
        )}
        <button
          className="changeLoc-btn"
          type="button"
          onClick={() => setIsChangingLocation(true)}
        >
          Change Location
        </button>
      </div>
    );
  }

  const handleConfirm = () => {
    if (!validateLocation()) return;
    alert("Location confirmed!");
    setShowLocationForm(false);
  };

  // ------------------- // Validation Helpers // -------------------
  const validateYear = (year, label = "Year") => {
    const currentYear = new Date().getFullYear();

    if (!year) return `${label} is required.`;
    if (!/^\d{4}$/.test(year)) return `${label} must be a 4-digit number.`;
    if (year < 1990 || year > currentYear)
      return `${label} must be between 1990 and ${currentYear}.`;

    return null;
  };
  const validateForm = () => {
  const errors = [];

  // ----------------- Common fields -----------------
  if (!formData.title) errors.push("Title is required.");
  if (!formData.description) errors.push("Description is required.");
  if (!formData.price || formData.price <= 0)
    errors.push("Price must be greater than 0.");

  // ----------------- Location validation -----------------
  if (!formData.locationMode) {
    errors.push("Please select a location mode (manual or GPS).");
  } else if (formData.locationMode === "manual") {
    if (!formData.manualLocation.address)
      errors.push("Manual address is required.");
    if (!formData.manualLocation.pincode)
      errors.push("Pincode is required for manual location.");
    if (!formData.city) errors.push("City is required.");
    if (!formData.state) errors.push("State is required.");
  } else if (formData.locationMode === "gps") {
    if (
      !formData.gpsLocation ||
      !formData.gpsLocation.coordinates ||
      formData.gpsLocation.coordinates.length !== 2 ||
      (formData.gpsLocation.coordinates[0] === 0 &&
        formData.gpsLocation.coordinates[1] === 0)
    ) {
      errors.push("Valid GPS coordinates are required.");
    }
    
  }

  // ----------------- Category-specific validation -----------------
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
  const handlePhotoChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const newUploading = [...uploading];
    newUploading[index] = true;
    setUploading(newUploading);

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: data,
        }
      );
      const result = await res.json();

      if (result.secure_url) {
        const newPhotos = [...photos];
        newPhotos[index] = result.secure_url;
        setPhotos(newPhotos);
      } else {
        throw new Error("Image upload failed, no secure_url received.");
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      alert("Error uploading image.");
    } finally {
      const finalUploading = [...uploading];
      finalUploading[index] = false;
      setUploading(finalUploading);
    }
  };

  // ------------------- // Render Photo Grid // -------------------
  const renderPhotoGrid = () => (
    <div className="photo-grid">
      {Array.from({ length: 20 }).map((_, index) => (
        <label key={index} className="photo-box">
          {uploading[index] ? (
            <div className="loader"></div> /* Simple CSS loader */
          ) : photos[index] ? (
            <img src={photos[index]} alt={`upload-${index}`} />
          ) : (
            <span className="plus">+</span>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoChange(e, index)}
            disabled={uploading[index]}
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

    // ✅ Ensure reverse geocoded city/state if GPS mode
  if (formData.locationMode === "gps" && (!formData.city || !formData.state)) {
    const loc = await reverseGeocode(
      formData.gpsLocation.coordinates[1], // lat
      formData.gpsLocation.coordinates[0]  // lng
    );
    setFormData((prev) => ({
      ...prev,
      city: loc.city,
      state: loc.state,
    }));
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
    const finalPhotoUrls = photos.filter((p) => p !== null);

    if (finalPhotoUrls.length === 0) {
      alert("Please upload at least one photo.");
      return;
    }

    const productData = {
      title: title || "",
      description: description || "",
      price: price ?? 0,
      categoryId: categoryId ?? 0,
      photoUrls: finalPhotoUrls,
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
        </h3>{" "}
        {renderCommonFields()} <label>Brand *</label>{" "}
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
              {" "}
              {renderCommonFields()}{" "}
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
              {" "}
              {renderCommonFields()} <label>Tablet Type *</label>{" "}
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

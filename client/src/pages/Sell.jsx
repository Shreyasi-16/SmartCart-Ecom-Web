import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import VerificationForm from "../Component/VerificationForm";
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
 const [showVerification, setShowVerification] = useState(false);
  const requiredFields = ["title", "brand", "model", "year", "price", "description"];
  const [verificationStatus, setVerificationStatus] = useState("");
   const handleVerificationToggle = () => {
    const allFilled = requiredFields.every(
      (field) => formData[field] && formData[field].trim() !== ""
    );
    if (!allFilled) {
      alert("Please complete all required fields before opening verification.");
      return;
    }
    setShowVerification(!showVerification);
  };

  // Add these states (store original File objects for WebODM uploads, and 3D preferences)
const [photosFiles, setPhotosFiles] = useState(Array(20).fill(null)); // store original File objects
const [wants3D, setWants3D] = useState(false);       // whether user wants a 3D model
const [confirmed3DInstr, setConfirmed3DInstr] = useState(false); // user confirmed reading instructions
const [webodmStatus, setWebodmStatus] = useState(null); // show upload / processing status

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
     verificationId: null,
    verificationStatus: "",
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

const uploadSinglePhoto = async (file, index) => {
  // Save original File for WebODM
  setPhotosFiles((prev) => {
    const copy = [...prev];
    copy[index] = file;
    return copy;
  });

  setUploading((prev) => {
    const copy = [...prev];
    copy[index] = true;
    return copy;
  });

  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );
    const result = await res.json();

    if (result.secure_url) {
      setPhotos((prev) => {
        const copy = [...prev];
        copy[index] = result.secure_url;
        return copy;
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
  } finally {
    setUploading((prev) => {
      const copy = [...prev];
      copy[index] = false;
      return copy;
    });
  }
};

// multiole photos 
// NEW: Upload multiple photos at once
const handleMultiplePhotos = async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let nextIndex = photos.findIndex((p) => p === null);
  if (nextIndex === -1) {
    alert("You cannot upload more than 40 photos.");
    return;
  }

  for (let file of files) {
    if (nextIndex >= 40) break;

    await uploadSinglePhoto(file, nextIndex);
    nextIndex++;
  }
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

  // Save original file so we can send to WebODM later if requested
  setPhotosFiles(prev => {
    const copy = [...prev];
    copy[index] = file;
    return copy;
  });

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
    // roll back original file if you want:
    setPhotosFiles(prev => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  } finally {
    const finalUploading = [...uploading];
    finalUploading[index] = false;
    setUploading(finalUploading);
  }
};


  // ------------------- // Render Photo Grid // -------------------
//   const renderPhotoGrid = () => (
//     <div className="photo-grid">
//       {Array.from({ length: 40 }).map((_, index) => (
//         <label key={index} className="photo-box">
//           {uploading[index] ? (
//             <div className="loader"></div> /* Simple CSS loader */
//           ) : photos[index] ? (
//             <img src={photos[index]} alt={`upload-${index}`} />
//           ) : (
//             <span className="plus">+</span>
//           )}
//           {/* <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => handlePhotoChange(e, index)}
//             disabled={uploading[index]}
//             hidden
//           /> */}
//           <input
//   type="file"
//   accept="image/*"
//   multiple     // ✅ allow selecting many photos
//   onChange={(e) => handleMultiplePhotos(e)}
//   hidden
// />

//         </label>
//       ))}
//     </div>
//   );

const renderPhotoGrid = () => (
  <div className="photo-grid">
    <label className="photo-box upload-all">
      <span className="plus">Upload Photos</span>
      <input type="file" accept="image/*" multiple onChange={handleMultiplePhotos} hidden />
    </label>

    {Array.from({ length: 40 }).map((_, index) => (
      <label key={index} className="photo-box">
        {uploading[index] ? (
          <div className="loader"></div>
        ) : photos[index] ? (
          <img src={photos[index]} alt={`upload-${index}`} />
        ) : (
          <span className="plus">+</span>
        )}

        {/* Single upload still works if user wants */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => uploadSinglePhoto(e.target.files[0], index)}
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
                // Add verificationId here
    verificationId: formData.verificationId || null,
    verificationStatus: formData.verificationStatus ,
    };
    // If user requested 3D model, and they confirmed instructions, upload original files to WebODM via your backend
// let webodmModels = null;
// if (wants3D) {
//   if (!confirmed3DInstr) {
//     alert("Please confirm you followed the 3D photo instructions before proceeding.");
//     return;
//   }

//   // gather files from photosFiles
//   const filesToSend = photosFiles.filter(f => f !== null);
//   if (filesToSend.length < 5) { // arbitrary minimum
//     if (!confirm("You have fewer than 5 original photos — results may be poor. Continue?")) {
//       return;
//     }
//   }

//   // try {
//   //   setWebodmStatus("Uploading photos to server...");
//   //   const fd = new FormData();
//   //   filesToSend.forEach((file, i) => fd.append("images", file, file.name));
//   //   fd.append("name", `SmartCart-ad-${Date.now()}`);

//   //   // POST to your Node endpoint that wraps WebODM (route from earlier example)
//   //   const resp = await fetch("http://localhost:5000/api/webodm/task", {
//   //     method: "POST",
//   //     body: fd,
//   //   });

//   //   const json = await resp.json();
//   //   if (!resp.ok) throw new Error(json.error || "WebODM upload failed");

//   //   // Expecting { models: [{ name, path }], taskId, ... } per earlier server code
//   //   webodmModels = json.models || null;
//   //   setWebodmStatus(json.message || "Uploaded and processing");
//   // } catch (err) {
//   //   console.error("WebODM upload error:", err);
//   //   alert("Failed to upload photos for 3D model: " + (err.message || err));
//   //   setWebodmStatus(null);
//   //   // optionally let user continue posting ad without 3D:
//   //   if (!confirm("Proceed to post the ad without 3D model?")) return;
//   // }
// }
// // Attach any model links to productData for server to store or show
// if (webodmModels && webodmModels.length > 0) {
//   productData.modelUrls = webodmModels.map(m => `http://localhost:5000${m.path}`);
// }

//     console.log("Submitting productData:", productData);
//     try {
//       const res = await fetch("http://localhost:5000/api/sell", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(productData),
//       });

//       const data = await res.json();
//       // after `const data = await res.json();`
// let created = null;
// if (res.ok) {
//   created = data.product || data; // adapt if your API returns data differently
//   alert("Ad posted successfully!");
//   console.log("Inserted Product:", created);
// } else {
//   alert("Error: " + (data.error || JSON.stringify(data)));
//   return; // stop here if product creation failed
// }

// // If user wanted 3D, upload originals to WebODM AFTER product exists
// if (wants3D && created) {
//   // sanity checks
//   if (!filesToSend || filesToSend.length === 0) {
//     console.warn("No original files available to upload to WebODM.");
//   } else {
//     try {
//       setWebodmStatus("Uploading original photos to WebODM...");
//       const fd2 = new FormData();
//       filesToSend.forEach((file) => fd2.append("images", file, file.name));

//       // attach productId so server can link model -> product
//       fd2.append("productId", created._id || String(created._id));

//       // optional task name
//       fd2.append("name", `SmartCart-ad-${created._id || Date.now()}`);

//       const wresp = await fetch("http://localhost:5000/api/webodm/task", {
//         method: "POST",
//         body: fd2,
//       });

//       let wjson = null;
//       try { wjson = await wresp.json(); } catch (e) { wjson = null; }

//       if (!wresp.ok) {
//         console.warn("WebODM upload returned non-ok:", wjson || wresp.statusText);
//         setWebodmStatus(null);
//         if (!confirm("WebODM upload failed. Continue without 3D model?")) return;
//       } else {
//         setWebodmStatus("WebODM uploaded — saving model reference to product...");

//         console.log("[webodm] response:", wjson);

//         // Build payload depending on response shape.
//         // If your server returns models: [{ path: "/download/..." }] and/or fileId, adapt accordingly.
//         const modelUrls = (wjson?.models || []).map(m => {
//           // m.path might already be absolute; only prefix if relative
//           if (!m.path) return null;
//           return m.path.startsWith("http") ? m.path : `http://localhost:5000${m.path}`;
//         }).filter(Boolean);

//         const attachBody = {
//           modelUrls: modelUrls.length ? modelUrls : undefined,
//           modelFileId: wjson?.fileId || undefined,
//           webodmTaskId: wjson?.taskId || wjson?.task_id || undefined,
//           modelStatus: wjson?.fileId ? "ready" : "processing"
//         };

//         // remove undefined fields
//         Object.keys(attachBody).forEach(k => attachBody[k] === undefined && delete attachBody[k]);

//         // Make sure this route exists on your server and path is correct.
//         // Change the URL if your server mounts product routes at /api/products instead.
//         const attachUrl = `http://localhost:5000/products/${created._id}/attach-model`;

//         const attachRes = await fetch(attachUrl, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(attachBody),
//         });

//         if (!attachRes.ok) {
//           console.warn("Failed to attach model to product:", await attachRes.text());
//         } else {
//           console.log("Model attached to product.");
//         }

//         setWebodmStatus("Model attached to product");
      
//        }  // <-- closes the inner `if (!wresp.ok) else {`
//     } catch (err) {     // <-- add this catch to close the try
//       console.error("WebODM post-create upload error:", err);
//       setWebodmStatus(null);
//       if (!confirm("Failed to upload to WebODM. Continue posting without 3D model?")) return;
//     }
//   } // <-- closes the "else" (has filesToSend)
// } // <-
  // collect filesToSend in outer scope so we can use it both before and after product creation
let webodmModels = null;
let filesToSend = Array.isArray(photosFiles) ? photosFiles.filter(f => f !== null) : [];

if (wants3D) {
  if (!confirmed3DInstr) {
    alert("Please confirm you followed the 3D photo instructions before proceeding.");
    return;
  }

  if (filesToSend.length < 5) { // arbitrary minimum
    if (!confirm("You have fewer than 5 original photos — results may be poor. Continue?")) {
      return;
    }
  }

  // (optional) you can do an early / synchronous upload here if you prefer, but
  // in the flow below we upload AFTER product creation so that the productId exists.
  // webodmModels = ... (you already commented out the early upload)
}

// Attach any model links to productData for server to store or show
if (webodmModels && webodmModels.length > 0) {
  productData.modelUrls = webodmModels.map(m => `http://localhost:5000${m.path}`);
}

console.log("Submitting productData:", productData);

try {
  const res = await fetch("http://localhost:5000/api/sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });

  const data = await res.json();
  // after `const data = await res.json();`
  let created = null;
  if (res.ok) {
    created = data.product || data; // adapt if your API returns data differently
    alert("Ad posted successfully!");
    console.log("Inserted Product:", created);
  } else {
    alert("Error: " + (data.error || JSON.stringify(data)));
    return; // stop here if product creation failed
  }

  // If user wanted 3D, upload originals to WebODM AFTER product exists
  if (wants3D && created) {
    if (!filesToSend || filesToSend.length === 0) {
      console.warn("No original files available to upload to WebODM.");
    } else {
      try {
        setWebodmStatus("Uploading original photos to WebODM...");
        const fd2 = new FormData();
        filesToSend.forEach((file) => fd2.append("images", file, file.name));

        // attach productId so server can link model -> product
        fd2.append("productId", created._id || String(created._id));

        // optional task name
        fd2.append("name", `SmartCart-ad-${created._id || Date.now()}`);

        const wresp = await fetch("http://localhost:5000/api/webodm/task", {
          method: "POST",
          body: fd2,
        });

        let wjson = null;
        try { wjson = await wresp.json(); } catch (e) { wjson = null; }

        if (!wresp.ok) {
          console.warn("WebODM upload returned non-ok:", wjson || wresp.statusText);
          setWebodmStatus(null);
          if (!confirm("WebODM upload failed. Continue without 3D model?")) return;
        } else {
          setWebodmStatus("WebODM uploaded — saving model reference to product...");

          console.log("[webodm] response:", wjson);

          // Build payload depending on response shape.
          const modelUrls = (wjson?.models || []).map(m => {
            if (!m?.path) return null;
            return m.path.startsWith("http") ? m.path : `http://localhost:5000${m.path}`;
          }).filter(Boolean);

          const attachBody = {
            modelUrls: modelUrls.length ? modelUrls : undefined,
            modelFileId: wjson?.fileId || undefined,
            webodmTaskId: wjson?.taskId || wjson?.task_id || undefined,
            modelStatus: wjson?.fileId ? "ready" : "processing"
          };

          // remove undefined fields
          Object.keys(attachBody).forEach(k => attachBody[k] === undefined && delete attachBody[k]);

          const attachUrl = `http://localhost:5000/products/${created._id}/attach-model`;

          const attachRes = await fetch(attachUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attachBody),
          });

          if (!attachRes.ok) {
            console.warn("Failed to attach model to product:", await attachRes.text());
          } else {
            console.log("Model attached to product.");
          }

          setWebodmStatus("Model attached to product");
        }
      } catch (err) {
        // Catches errors that happen during wresp upload/attach steps
        console.error("WebODM post-create upload error:", err);
        setWebodmStatus(null);
        if (!confirm("Failed to upload to WebODM. Continue posting without 3D model?")) return;
      }
    }
  }

} catch (err) {
  // Catches errors from the product creation request itself
  console.error("Error posting ad:", err);
  alert("Something went wrong!");
  setWebodmStatus(null);
}
};

    

  //     if (res.ok) {
  //       alert("Ad posted successfully!");
  //       console.log("Inserted Product:", data);
  //           // --- AFTER product created: optionally upload original photos to WebODM and attach model to product ---
  //   let created = null;
  //   if (res.ok) {
  //     // `data` is your server response; adapt if your API returns data.product
  //     created = data.product || data;
  //   }

  //   if (wants3D && created) {
  //     try {
  //       setWebodmStatus("Uploading original photos to WebODM...");
  //       const fd2 = new FormData();
  //       // attach files (originals) — same filesToSend array you built earlier
  //       filesToSend.forEach((file) => fd2.append("images", file, file.name));
  //       // attach the product id so server can link model -> product
  //       fd2.append("productId", created._id || created._id?.toString());

  //       // option: give the task a name
  //       fd2.append("name", `SmartCart-ad-${created._id || Date.now()}`);

  //       const wresp = await fetch("http://localhost:5000/api/webodm/task", {
  //         method: "POST",
  //         body: fd2,
  //       });

  //       const wjson = await wresp.json();
  //       if (!wresp.ok) {
  //         console.warn("WebODM upload returned non-ok:", wjson);
  //         // allow ad to remain posted, but notify user
  //         setWebodmStatus(null);
  //         if (!confirm("WebODM upload failed. Continue without 3D model?")) return;
  //       } else {
  //         setWebodmStatus("WebODM uploaded — saving model reference to product...");

  //         // If your /api/webodm/task returns { fileId, models, taskId, ... } adapt accordingly.
  //         // Example: assume wjson.fileId or wjson.models[] with path information.
  //         // We'll call a product-update endpoint to attach the model metadata to the product.

  //         // Build payload to attach to product (adjust to what your backend expects)
  //         const attachBody = {
  //           modelUrls: (wjson.models || []).map(m => `http://localhost:5000${m.path}`),
  //           modelFileId: wjson.fileId || null,
  //           webodmTaskId: wjson.taskId || null,
  //           modelStatus: wjson.fileId ? "ready" : "processing"
  //         };

  //         // Call your product-update endpoint (create one if doesn't exist)
  //         await fetch(`http://localhost:5000/products/${created._id}/attach-model`, {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify(attachBody),
  //         });

  //         setWebodmStatus("Model attached to product");
  //       }
  //     } catch (err) {
  //       console.error("WebODM post-create upload error:", err);
  //       setWebodmStatus(null);
  //       if (!confirm("Failed to upload to WebODM. Continue posting without 3D model?")) return;
  //     }
  //   }

  //     } else {
  //       alert("Error: " + data.error);
  //     }
  //   } catch (err) {
  //     console.error("Error posting ad:", err);
  //     alert("Something went wrong!");
  //   }
  // };

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
      <div className="mt-3">
        <label>Verification *</label>
      
        {/*  Show button only if category is NOT 8 */}
        {selectedCategory !== 8 ? (
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setShowVerification(true)}
          >
            Open Verification
          </button>
        ) : (
          <p className="text-muted">Verification not required for this category.</p>
        )}
      </div>
      
      {/* Open modal only if category is NOT 8 */}
      {selectedCategory !== 8 && (
        <VerificationForm
          isOpen={showVerification}
          onClose={(verificationId, verificationStatus) => {
            console.log("Verification completed:", verificationId, verificationStatus);
            setShowVerification(false);
            setVerificationStatus(verificationStatus);
      
            if (verificationId) {
              console.log(" Verification created with ID:", verificationId);
      
              setFormData((prev) => ({
                ...prev,
                verificationId,
                verificationStatus,
              }));
            }
          }}
          sellerId={user.uid}
          categoryId={selectedCategory}
        />
      )}
      
      {/* Show status as before */}
      {verificationStatus && (
        <div className="alert alert-info mt-3">
          Current Verification Status: {verificationStatus}
        </div>
      )}
      
      
          </>
      
  );
  // Add this component in Sell.jsx (below renderPhotoGrid or near other render helpers)
function Photo3DOptions() {
  return (
    <div className="photo-3d-options" style={{ marginBottom: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={wants3D}
          onChange={(e) => {
            setWants3D(e.target.checked);
            if (!e.target.checked) {
              setConfirmed3DInstr(false);
              setWebodmStatus(null);
            }
          }}
        />
        <strong>Generate 3D model from uploaded photos</strong>
      </label>

      {wants3D && (
        <div className="photo-3d-instructions" style={{
          border: "1px solid #ddd", padding: 12, marginTop: 8, borderRadius: 6, background: "#fafafa"
        }}>
          <p><strong>Quick instructions for good photogrammetry results</strong></p>
          <ul style={{ margin: "8px 0 12px 18px" }}>
            <li>Take many overlapping photos of the object from all sides (aim for 30–100 images for small objects; 50+ for good results).</li>
            <li>Keep the object centered; maintain consistent exposure and focus.</li>
            <li>Move the camera slowly in a circle, capturing multiple heights (top/side/45° angles).</li>
            <li>Avoid motion blur, reflections, and repetitive textures.</li>
            <li>Prefer plain backgrounds for small objects; for large scenes capture ground control points if needed.</li>
          </ul>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={confirmed3DInstr}
              onChange={(e) => setConfirmed3DInstr(e.target.checked)}
            />
            I confirm I followed the instructions above and want a 3D model.
          </label>

          <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
            When you submit, original photos (not just Cloudinary URLs) will be uploaded to our server to create a WebODM task.
          </div>

          {webodmStatus && (
            <div style={{ marginTop: 8, color: "#0b6" }}>
              <strong>WebODM:</strong> {webodmStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
          <h4>Upload up to 20 Photos</h4> <Photo3DOptions />{renderPhotoGrid()}
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
          <h4>Upload up to 20 Photos</h4> <Photo3DOptions />
          {renderPhotoGrid()}
          {renderLocation(formData)}
          {webodmStatus && <div className="webodm-status">WebODM: {webodmStatus}</div>}

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
        <h4>Upload up to 20 Photos</h4> <Photo3DOptions />{renderPhotoGrid()}
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
          <h4>Upload up to 20 Photos</h4> <Photo3DOptions />{renderPhotoGrid()}
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
          <h4>Upload up to 20 Photos</h4> <Photo3DOptions />{renderPhotoGrid()}
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
          <h4>Upload up to 20 Photos</h4> <Photo3DOptions />{renderPhotoGrid()}
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

  
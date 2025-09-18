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
  // -------------------
  // State Variables
  // -------------------
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [photos, setPhotos] = useState(Array(20).fill(null));
  const [formData, setFormData] = useState({});
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [owner, setOwner] = useState("");
  const [userId, setUserId] = useState(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // ✅ get Firebase UID
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // -------------------
  // Subcategories
  // -------------------
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


  // -------------------
  // Categories List
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

  // -------------------
  // Handle Input Change
  // -------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  // -------------------
  // Render Photo Grid
  // -------------------
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
  // Submit Form
  // -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { title, description, price, state, city } = formData;

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

   

    // -------------------
    // Category ID override for Mobiles
    // -------------------
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
  if (selectedSubcategory === "Women" && formData.fashionType === "Clothing")
    categoryId = 601;
  if (selectedSubcategory === "Women" && formData.fashionType === "Accessories")
    categoryId = 602;
  if (selectedSubcategory === "Men" && formData.fashionType === "Clothing")
    categoryId = 603;
  if (selectedSubcategory === "Men" && formData.fashionType === "Accessories")
    categoryId = 604;
  if (selectedSubcategory === "Kids" && formData.fashionType === "Clothing")
    categoryId = 605;
  if (selectedSubcategory === "Kids" && formData.fashionType === "Accessories")
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
      price: price || "",
      state: state || "",
      city: city || "",
      categoryId: String(categoryId ?? ""),
      photos: photos.filter((p) => p !== null),
      attributes,
      seller: userId,
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

  // -------------------
  // Common Fields
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
      ></textarea>
      <input
        type="number"
        name="price"
        placeholder="Price (₹)"
        value={formData.price || ""}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="state"
        placeholder="State"
        value={formData.state || ""}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="city"
        placeholder="City"
        value={formData.city || ""}
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
        <button className="back-arrow" onClick={() => setSelectedCategory(null)}>
          ←
        </button>
        <div className="subcategory-grid">
          {["Books", "Sports", "Hobbies"].map((sub) => (
            <div
              key={sub}
              className="subcategory-card"
              onClick={() => setSelectedSubcategory(sub)}
            >
              <span className="subcategory-name">{sub}</span>
              <span className="subcategory-arrow">›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Detailed form after choosing a subcategory
  return (
    <div className="form-container">
      <button className="back-arrow" onClick={() => setSelectedSubcategory("")}>
        ←
      </button>
      <form className="category-form" onSubmit={handleSubmit}>
        <h3 className="form-heading">{selectedSubcategory} Details</h3>

        {renderCommonFields()}

        <label>Year *</label>
        <input
          type="number"
          name="year"
          placeholder="Enter Year"
          value={formData.year || ""}
          onChange={handleChange}
          required
        />

        <label>Condition *</label>
        <select
          name="condition"
          value={formData.condition || ""}
          onChange={handleChange}
          required
        >
          <option value="">Select Condition</option>
          <option value="New">New</option>
          <option value="Like New">Like New</option>
          <option value="Used">Used</option>
          <option value="Old">Old</option>
        </select>

        <h4>Upload up to 20 Photos</h4>
        {renderPhotoGrid()}
        <button type="submit" className="submit-btn">
          Post Ad
        </button>
      </form>
    </div>
  );
};

const renderPetsForm = () => {
  return (
    <div className="form-container">
      <button className="back-arrow" onClick={() => setSelectedCategory(null)}>
        ←
      </button>
      <form className="category-form" onSubmit={handleSubmit}>
        <h3 className="form-heading">Pets Details</h3>

        {renderCommonFields()}

        <label>Year *</label>
        <input
          type="number"
          name="year"
          placeholder="Enter Year"
          value={formData.year || ""}
          onChange={handleChange}
          required
        />

        <label>Type *</label>
        <select
          name="type"
          value={formData.type || ""}
          onChange={handleChange}
          required
        >
          <option value="">Select Type</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Bird">Bird</option>
          <option value="Fish">Fish</option>
          <option value="Other">Other</option>
        </select>

        <h4>Upload up to 20 Photos</h4>
        {renderPhotoGrid()}
        <button type="submit" className="submit-btn">
          Post Ad
        </button>
      </form>
    </div>
  );
};


  // -------------------
  // Electronics Form
  // -------------------
  const renderElectronicsForm = () => {
    if (!selectedSubcategory) {
      return (
        <div className="subcategory-grid">
          {electronicsSubcategories.map((sub) => (
            <div
              key={sub}
              className="subcategory-card"
              onClick={() => setSelectedSubcategory(sub)}
            >
              <span className="subcategory-name">{sub}</span>
              <span className="subcategory-arrow">›</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <form className="category-form" onSubmit={handleSubmit}>
        <h3 className="form-heading">{selectedSubcategory} Details</h3>

        <label>Brand *</label>
        <input
          type="text"
          name="brand"
          placeholder="Enter Brand"
          value={formData.brand || ""}
          onChange={handleChange}
          required
        />

        <label>Model *</label>
        <input
          type="text"
          name="model"
          placeholder="Enter Model"
          value={formData.model || ""}
          onChange={handleChange}
          required
        />

        <label>Year *</label>
        <input
          type="number"
          name="year"
          placeholder="Enter Year"
          value={formData.year || ""}
          onChange={handleChange}
          required
        />

        {renderCommonFields()}

        <h4>Upload up to 20 Photos</h4>
        {renderPhotoGrid()}
        <button type="submit" className="submit-btn">
          Post Ad
        </button>
      </form>
    );
  };

  // -------------------
  // Mobile Form
  // -------------------
  const renderMobileForm = () => {
    if (!selectedSubcategory) {
      return (
        <div className="form-container">
          <button className="back-arrow" onClick={() => setSelectedCategory(null)}>
            ←
          </button>
          <div className="subcategory-grid">
            {mobileSubcategories.map((sub) => (
              <div
                key={sub}
                className="subcategory-card"
                onClick={() => setSelectedSubcategory(sub)}
              >
                <span className="subcategory-name">{sub}</span>
                <span className="subcategory-arrow">›</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="form-container">
        <button className="back-arrow" onClick={() => setSelectedSubcategory("")}>
          ←
        </button>
        <form className="category-form" onSubmit={handleSubmit}>
          <h3 className="form-heading">{selectedSubcategory} Details</h3>

          {selectedSubcategory === "Mobile Phones" && (
            <>
              <input
                type="text"
                name="brand"
                placeholder="Brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              />

              <label>Year *</label>
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />
            </>
          )}

          {selectedSubcategory === "Tablets" && (
            <>
              <label>Tablet Type *</label>
              <div className="button-group">
                {["Samsung", "iPad", "Other"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={formData.tabletType === t ? "active" : ""}
                    onClick={() => setFormData({ ...formData, tabletType: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label>Year *</label>
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />
            </>
          )}

          {renderCommonFields()}

          <h4>Upload up to 20 Photos</h4>
          {renderPhotoGrid()}
          <button type="submit" className="submit-btn">
            Post Ad
          </button>
        </form>
      </div>
    );
  };

  // -------------------
  // Fashion Form
  // -------------------
 const renderFashionForm = () => {
  // First level: Men/Women/Kids
  if (!selectedSubcategory) {
    return (
      <div className="form-container">
        <button className="back-arrow" onClick={() => setSelectedCategory(null)}>
          ←
        </button>
        <div className="subcategory-grid">
          {fashionSubcategories.map((sub) => (
            <div
              key={sub}
              className="subcategory-card"
              onClick={() => setSelectedSubcategory(sub)}
            >
              <span className="subcategory-name">{sub}</span>
              <span className="subcategory-arrow">›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Second level: Clothing / Accessories
  if (selectedSubcategory && !formData.fashionType) {
    return (
      <div className="form-container">
        <button className="back-arrow" onClick={() => setSelectedSubcategory("")}>
          ←
        </button>
        <div className="subcategory-grid">
          {fashionNestedSubcategories[selectedSubcategory].map((nested) => (
            <div
              key={nested}
              className="subcategory-card"
              onClick={() => setFormData({ ...formData, fashionType: nested })}
            >
              <span className="subcategory-name">{nested}</span>
              <span className="subcategory-arrow">›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Final form after Clothing / Accessories selection
  return (
    <div className="form-container">
      <button
        className="back-arrow"
        onClick={() => setFormData({ ...formData, fashionType: "" })}
      >
        ←
      </button>
      <form className="category-form" onSubmit={handleSubmit}>
        <h3 className="form-heading">
          {selectedSubcategory} - {formData.fashionType} Details
        </h3>

        {renderCommonFields()}
        

  <label>Brand *</label>
  <input
    type="text"
    name="brand"
    placeholder="Enter Brand"
    value={formData.brand || ""}
    onChange={handleChange}
    required
  />

  <label>Year *</label>
  <input
    type="number"
    name="year"
    placeholder="Enter Year"
    value={formData.year || ""}
    onChange={handleChange}
    required
  />

  <label>Size *</label>
  <input
    type="text"
    name="size"
    placeholder="Enter Size"
    value={formData.size || ""}
    onChange={handleChange}
    required
  />


  

        <h4>Upload up to 20 Photos</h4>
        {renderPhotoGrid()}
        <button type="submit" className="submit-btn">
          Post Ad
        </button>
      </form>
    </div>
  );
};
  // -------------------
  // Render Category Form
  // -------------------
  const renderForm = () => {
    const selectedCatObj = categories.find((cat) => cat.id === selectedCategory);

    if (selectedCategory === 2) return renderMobileForm();
    if (selectedCategory === 6) return renderFashionForm();
    if (selectedCategory === 4) return renderElectronicsForm();
    if (selectedCategory === 7) return renderBooksSportsHobbiesForm();
    if (selectedCategory === 8) return renderPetsForm();


    return (
      <div className="form-container">
        <button
          className="back-arrow"
          onClick={() =>
            selectedSubcategory ? setSelectedSubcategory("") : setSelectedCategory(null)
          }
        >
          ←
        </button>
        <form className="category-form" onSubmit={handleSubmit}>
          <h3>Post an Ad for {selectedCatObj?.name}</h3>
          {renderCommonFields()}
          {/* Cars */}
          {selectedCategory === 5 && (
          <>
            <label>Brand *</label>
            <input
              type="text"
              name="brand"
              placeholder="Enter Brand"
              value={formData.brand || ""}
              onChange={handleChange}
              required
            />
            <label>Model *</label>
            <input
              type="text"
              name="model"
              placeholder="Enter Model"
              value={formData.model || ""}
              onChange={handleChange}
              required
            />
            <label>Year *</label>
            <input
              type="number"
              name="year"
              placeholder="Enter Year"
              value={formData.year || ""}
              onChange={handleChange}
              required
            />
          </>
        )}

          {selectedCategory === 1 && (
            <>
              <label>Brand *</label>
              <select
                name="brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              >
                <option value="">Select Brand</option>
                <option value="Maruti">Maruti</option>
                <option value="Hyundai">Hyundai</option>
                <option value="Tata">Tata</option>
                <option value="Honda">Honda</option>
                <option value="Mahindra">Mahindra</option>
              </select>
              <label>Model *</label>
              <input
                type="text"
                name="model"
                placeholder="Model"
                value={formData.model || ""}
                onChange={handleChange}
                required
              />
              <label>Year *</label>
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />
              <label>Fuel *</label>
              <div className="button-group">
                {["Petrol", "Diesel", "CNG & Hybrids", "Electric", "LPG"].map((f) => (
                  <button
                    type="button"
                    key={f}
                    className={fuel === f ? "active" : ""}
                    onClick={() => setFuel(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <label>Transmission *</label>
              <div className="button-group">
                {["Automatic", "Manual"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={transmission === t ? "active" : ""}
                    onClick={() => setTransmission(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label>KM driven *</label>
              <input
                type="number"
                name="kmDriven"
                placeholder="Enter KM Driven"
                value={formData.kmDriven || ""}
                onChange={handleChange}
                required
              />
              <label>No. of Owners *</label>
              <div className="button-group">
                {["1st", "2nd", "3rd", "4th", "4+"].map((o) => (
                  <button
                    type="button"
                    key={o}
                    className={owner === o ? "active" : ""}
                    onClick={() => setOwner(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}
          {/* Bikes */}
          {selectedCategory === 3 && (
            <>
              <label>Brand *</label>
              <input
                type="text"
                name="brand"
                placeholder="Enter Brand"
                value={formData.brand || ""}
                onChange={handleChange}
                required
              />
              <label>Model *</label>
              <input
                type="text"
                name="model"
                placeholder="Enter Model"
                value={formData.model || ""}
                onChange={handleChange}
                required
              />
              <label>Vehicle Type *</label>
              <div className="button-group">
                {["Petrol", "EV"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={formData.vehicleType === t ? "active" : ""}
                    onClick={() => setFormData({ ...formData, vehicleType: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label>Year *</label>
              <input
                type="number"
                name="year"
                placeholder="Enter Year"
                value={formData.year || ""}
                onChange={handleChange}
                required
              />
              <label>KM Driven *</label>
              <input
                type="number"
                name="kmDriven"
                placeholder="Enter KM Driven"
                value={formData.kmDriven || ""}
                onChange={handleChange}
                required
              />
            </>
          )}

          <h4>Upload up to 20 Photos</h4>
          {renderPhotoGrid()}
          <button type="submit" className="submit-btn">
            Post Ad
          </button>
        </form>
      </div>
    );
  };

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
              {categories.map((cat, index) => (
                <li
                  key={index}
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
//final
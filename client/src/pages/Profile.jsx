import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    aboutMe: "",
    city: "",
    state: "",
    locationMode: "manual",
    manualLocation: { address: "", pincode: "" },
    gpsLocation: { type: "Point", coordinates: [0, 0] },
  });

  // ✅ Load user from Firebase + backend
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.photoURL) setPreview(currentUser.photoURL);

      if (currentUser) {
        fetch(`http://localhost:5000/api/users/getId/${currentUser.uid}`)
          .then((res) => {
            if (!res.ok) throw new Error("User fetch failed");
            return res.json();
          })
          .then((data) => {
            setFormData((prev) => ({
              ...prev,
              name: data.name || "",
              phone: data.phone || "",
              aboutMe: data.aboutMe || "",
              city: data.city || "",
              state: data.state || "",
              locationMode: data.locationMode || "manual",
              manualLocation: data.manualLocation || { address: "", pincode: "" },
              gpsLocation: data.gpsLocation || { type: "Point", coordinates: [0, 0] },
            }));
          })
          .catch((err) => console.error("Error fetching user data:", err));
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // ✅ Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !user) return;
    try {
      await updateProfile(user, { photoURL: preview });
      alert("Profile photo updated (locally).");
    } catch (err) {
      console.error(err);
      alert("Failed to update photo.");
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
      setUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Failed to log out.");
    }
  };

  // ✅ Form handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManualLocationChange = (e) => {
    setFormData({
      ...formData,
      manualLocation: { ...formData.manualLocation, [e.target.name]: e.target.value },
    });
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({
          ...formData,
          locationMode: "gps",
          gpsLocation: {
            type: "Point",
            coordinates: [pos.coords.longitude, pos.coords.latitude],
          },
        });
        alert("GPS location captured!");
      },
      (err) => {
        console.error(err);
        alert("Failed to fetch GPS location.");
      }
    );
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await fetch("http://localhost:5000/api/users/updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, ...formData }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Profile updated and synced with database!");
        setShowForm(false);
      } else {
        console.error("Failed to update profile:", data.message);
        alert("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile.");
    }
  };

  // ✅ UI
  return (
    <div className="profile-container">
      {user ? (
        <>
          <h1 className="profile-heading">Welcome, {user.displayName || "User"}</h1>
          <p className="profile-email">Email: {user.email}</p>

          <div className="profile-image-container">
            <img
              src={preview || "https://via.placeholder.com/150"}
              alt="Profile"
              className="profile-image"
            />
          </div>

          <label className="custom-file-upload">
            Upload New Photo
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          <button className="upload-button" onClick={handleUpload}>
            Save Photo
          </button>

          <button className="update-button" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Update Profile"}
          </button>

          {showForm && (
            <form className="update-form" onSubmit={handleUpdateProfile}>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
              />
              <input
                type="text"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
              />
              <textarea
                name="aboutMe"
                placeholder="About me..."
                value={formData.aboutMe}
                onChange={handleChange}
              />

              

              <div className="location-toggle">
                <label>
                  <input
                    type="radio"
                    checked={formData.locationMode === "manual"}
                    onChange={() =>
                      setFormData({ ...formData, locationMode: "manual" })
                    }
                  />
                  Manual
                </label>
                <label>
                  <input
                    type="radio"
                    checked={formData.locationMode === "gps"}
                    onChange={() =>
                      setFormData({ ...formData, locationMode: "gps" })
                    }
                  />
                  GPS
                </label>
              </div>

              {formData.locationMode === "manual" && (
                <>
                 {formData.locationMode === "manual" && (
  <>
    <input
      type="text"
      name="city"
      placeholder="City"
      value={formData.city}
      onChange={handleChange}
    />
    <input
      type="text"
      name="state"
      placeholder="State"
      value={formData.state}
      onChange={handleChange}
    />
    <input
      type="text"
      name="address"
      placeholder="Address"
      value={formData.manualLocation.address}
      onChange={handleManualLocationChange}
    />
    <input
      type="text"
      name="pincode"
      placeholder="Pincode"
      value={formData.manualLocation.pincode}
      onChange={handleManualLocationChange}
    />
  </>
)}

{formData.locationMode === "gps" && (
  <>
    <button type="button" onClick={handleGetGPS}>
      Get My GPS Location
    </button>
    {formData.gpsLocation.coordinates[0] !== 0 && (
      <p>
        Lat: {formData.gpsLocation.coordinates[1]}, Lng:{" "}
        {formData.gpsLocation.coordinates[0]}
      </p>
    )}
  </>
)}

                </>
              )}

              {formData.locationMode === "gps" && (
                <>
                  <button type="button" onClick={handleGetGPS}>
                    Get My GPS Location
                  </button>
                  {formData.gpsLocation.coordinates[0] !== 0 && (
                    <p>
                      Lat: {formData.gpsLocation.coordinates[1]}, Lng:{" "}
                      {formData.gpsLocation.coordinates[0]}
                    </p>
                  )}
                </>
              )}

              <button type="submit" className="save-button">
                Save Changes
              </button>
            </form>
          )}

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <p className="not-logged-in">You are not logged in.</p>
      )}
    </div>
  );
};

export default Profile;

import React, { useState, useEffect } from "react";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Profile.css"; // make sure CSS is imported

const Profile = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

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
              manualLocation:
                data.manualLocation || { address: "", pincode: "" },
              gpsLocation:
                data.gpsLocation || { type: "Point", coordinates: [0, 0] },
            }));
          })
          .catch((err) => console.error("Error fetching user data:", err));
      }
    });

    return () => unsubscribe();
  }, [auth]);

  
  // Hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
      setMessage("Profile image saved successfully!");
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      setMessage("Failed to update photo.");
    }
  };

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

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleManualLocationChange = (e) =>
    setFormData({
      ...formData,
      manualLocation: {
        ...formData.manualLocation,
        [e.target.name]: e.target.value,
      },
    });

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
        setMessage("Profile updated successfully!");
        setShowForm(false);
      } else {
        console.error("Failed to update profile:", data.message);
        setMessage("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    }
  };

  return (
    <div className="container mt-4 profile-page">
      {user ? (
        <div className="row">
          {/* LEFT SIDE */}
          <div className="col-md-4 text-center border-end">
            <img
              src={preview || "https://via.placeholder.com/150"}
              alt="Profile"
              className="img-fluid rounded-circle mb-3"
              style={{ width: "150px", height: "150px", objectFit: "cover" }}
            />

            <div className="mb-3">
              <input
                type="file"
                id="fileUpload"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <label
                htmlFor="fileUpload"
                className="btn btn-custom btn-outline-primary w-100"
              >
                Upload New Photo
              </label>
              {selectedImage && (
                <button
                  className="btn btn-custom btn-success mt-2 w-100"
                  onClick={handleUpload}
                >
                  Save Photo
                </button>
              )}
            </div>

            <button
              className="btn btn-custom btn-primary w-100 mb-2"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "Update Profile"}
            </button>

            <button
              className="btn btn-custom btn-danger w-100"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          {/* RIGHT SIDE */}
          <div className="col-md-8 ps-4">
            <h2>Welcome, {user.displayName || "User"}</h2>
            <p>Email: {user.email}</p>

            {message && <div className="alert alert-info mt-3">{message}</div>}

            {showForm && (
              <form className="mt-4" onSubmit={handleUpdateProfile}>
                <div className="mb-3">
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <input
                    type="text"
                    name="phone"
                    className="form-control"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <textarea
                    name="aboutMe"
                    className="form-control"
                    placeholder="About me..."
                    value={formData.aboutMe}
                    onChange={handleChange}
                  />
                </div>

                {/* City & State */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <input
                      type="text"
                      name="city"
                      className="form-control"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <input
                      type="text"
                      name="state"
                      className="form-control"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Location Mode Switch */}
                <div className="mb-3">
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className="form-check-input"
                      checked={formData.locationMode === "manual"}
                      onChange={() =>
                        setFormData({ ...formData, locationMode: "manual" })
                      }
                    />
                    <label className="form-check-label">Manual</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className="form-check-input"
                      checked={formData.locationMode === "gps"}
                      onChange={() =>
                        setFormData({ ...formData, locationMode: "gps" })
                      }
                    />
                    <label className="form-check-label">GPS</label>
                  </div>
                </div>

                {/* Manual fields */}
                {formData.locationMode === "manual" && (
                  <>
                    <div className="mb-3">
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        placeholder="Address"
                        value={formData.manualLocation.address}
                        onChange={handleManualLocationChange}
                      />
                    </div>
                    <div className="mb-3">
                      <input
                        type="text"
                        name="pincode"
                        className="form-control"
                        placeholder="Pincode"
                        value={formData.manualLocation.pincode}
                        onChange={handleManualLocationChange}
                      />
                    </div>
                  </>
                )}

                {/* GPS fields */}
                {formData.locationMode === "gps" && (
                  <>
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={handleGetGPS}
                      >
                        Get My GPS Location
                      </button>
                    </div>
                    {formData.gpsLocation.coordinates[0] !== 0 && (
                      <p>
                        Lat: {formData.gpsLocation.coordinates[1]}, Lng:{" "}
                        {formData.gpsLocation.coordinates[0]}
                      </p>
                    )}
                  </>
                )}

                {/* Save button in new line */}
                <div className="mt-3">
                  <button type="submit" className="btn btn-success w-100">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center">You are not logged in.</p>
      )}
    </div>
  );
};

export default Profile;

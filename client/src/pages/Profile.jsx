import React, { useState, useEffect } from "react";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import ChatDashboard from "../Component/ChatDashboard";
import PaymentProofForm from "../Component/PaymentProofForm";
import BuyerPaymentDashboard from "../Component/BuyerPaymentDashboard";
import axios from "axios";
import { FaShoppingCart, FaTrash, FaMoneyBillWave } from "react-icons/fa";
import { FiShoppingBag } from "react-icons/fi";
import Wishlist from "./Wishlist";
import { logEvent } from "../utils/logEvent";


import SellerPaymentDashboard from "../Component/SellerPaymentDashboard";


const Profile = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [mongoId, setMongoId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [userProducts, setUserProducts] = useState([]);
  const [showUserProducts, setShowUserProducts] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profileInfo"); // default tab
  const [sellerPayments, setSellerPayments] = useState([]);

  const [cartItems, setCartItems] = useState([]);
  useEffect(() => {
      if (activeTab === "myCart" && mongoId) {
        fetch(`http://localhost:5000/api/cart/${mongoId}`)
          .then((res) => res.json())
          .then((data) => setCartItems(data.cart || data))
          .catch((err) => console.error("Failed to load cart:", err));
      }
    }, [activeTab, mongoId]);
  
  //for chatboard
  const [showChatDashboard, setShowChatDashboard] = useState(false);

  const DEFAULT_PROFILE_IMAGE = "/defaultProfile.png";

  const DEFAULT_PRODUCT_IMAGE = "/defaultBG.jpg";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    aboutMe: "",
    city: "",
    state: "",
    locationMode: "manual",
    manualLocation: { address: "", pincode: "" },
    gpsLocation: { type: "Point", coordinates: [0, 0] },
    upiId: "", // ✅ New field
  });

  // Listen to Firebase user only once
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.photoURL) {
        setPreview(currentUser.photoURL);
      } else {
        setPreview(DEFAULT_PROFILE_IMAGE);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // ✅ Fetch all payments for this seller
useEffect(() => {
  if (!mongoId) return;
  fetch(`http://localhost:5000/api/paymentStatus/seller/${mongoId}`)
    .then((res) => res.json())
    .then((data) => setSellerPayments(data))
    .catch((err) => console.error("Error fetching seller payments:", err));
}, [mongoId]);


  // Fetch Mongo user data when Firebase user is available
  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5000/api/users/getId/${user.uid}`)
      .then((res) => {
        if (!res.ok) throw new Error("User fetch failed");
        return res.json();
      })
      .then((data) => {
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          aboutMe: data.aboutMe || "",
          city: data.city || "",
          state: data.state || "",
          locationMode: data.locationMode || "manual",
          manualLocation: data.manualLocation || { address: "", pincode: "" },
          gpsLocation: data.gpsLocation || { type: "Point", coordinates: [0, 0] },
          upiId: data.upiId || "", // ✅ New line
        });
        setMongoId(data._id);
      })
      .catch((err) => console.error("Error fetching user data:", err));
  }, [user]);

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
      await updateProfile(user, {
        photoURL: preview || DEFAULT_PROFILE_IMAGE,
      });
      setMessage("Profile image saved successfully");
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      setMessage("Failed to update photo");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully");
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Failed to log out");
    }
  };

  const fetchUserProducts = async () => {
    if (!mongoId) return;
    setProductsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/products/user/${mongoId}`);
      if (!res.ok) throw new Error("Failed to fetch user products");
      const data = await res.json();
      setUserProducts(data);
      setShowUserProducts(true);
      setActiveTab("myProducts");
    } catch (err) {
      console.error(err);
      alert("Failed to load your products");
    } finally {
      setProductsLoading(false);
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
      alert("Geolocation not supported by your browser");
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
        alert("GPS location captured");
      },
      (err) => {
        console.error(err);
        alert("Failed to fetch GPS location");
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
        setMessage("Profile updated successfully");
         setActiveTab("profileInfo");
         const locationData =
                 formData.locationMode === "gps"
               ? {
                   mode: "gps",
                   coordinates: formData.gpsLocation.coordinates,
                 }
               : {
                   mode: "manual",
                   city: formData.city,
                   state: formData.state,
                   address: formData.manualLocation.address,
                   pincode: formData.manualLocation.pincode,
                 };
         
                 await logEvent({
                   userId: mongoId,
                   eventType: "location_update",
                   location: locationData,
                 });
      
      } else {
        console.error("Failed to update profile:", data.message);
        setMessage("Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile");
    }
  };
  //handle dashboard notification
  const handleNotification=()=>
    {
      setShowChatDashboard(true);
    }
// ✅ Get payment info for a specific product
const getPaymentForProduct = (productId) => {
  if (!sellerPayments || sellerPayments.length === 0) return null;
  return sellerPayments.find((payment) => payment.productId?._id === productId);
};

   return (
    <div className="profile-wrapper">
      <div className="container py-5 profile-container">
        {user ? (
          <div className="row g-4">
            {/* SIDEBAR */}
            <div className="col-md-4">
              {/* Top Card: Photo, Name, Email */}
              <div className="card text-center mb-3">
                <div className="card-body">
                  <div className="profile-image-container position-relative mx-auto mb-2">
                    <img
                      src={preview}
                      alt="Profile"
                      className="profile-image"
                      onError={(e) => (e.target.src = DEFAULT_PROFILE_IMAGE)}
                    />
                    <label
                      htmlFor="fileUpload"
                      className="upload-overlay d-flex align-items-center justify-content-center"
                    >
                      <input
                        type="file"
                        id="fileUpload"
                        accept="image/*"
                        onChange={handleImageChange}
                        hidden
                      />
                      <span className="text-white fw-bold">Change</span>
                    </label>
                  </div>
                  <h5 className="card-title">{user.displayName || "User"}</h5>
                  <p className="text-muted">{user.email}</p>
                  {selectedImage && (
                    <button
                      className="btn btn-success w-100 mt-2"
                      onClick={handleUpload}
                    >
                      Save Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Card: Navigation */}
              <div className="card">
                <div className="card-body d-flex flex-column gap-2">
                  <button
                    className={`sidebar-btn text-start ${activeTab === "profileInfo" ? "active-tab" : ""}`}
                    onClick={() => setActiveTab("profileInfo")}
                  >
                    Profile Info
                  </button>
                  <button
                    className={`sidebar-btn text-start ${activeTab === "updateProfile" ? "active-tab" : ""}`}
                    onClick={() => setActiveTab("updateProfile")}
                  >
                    Update Profile
                  </button>
                  <button
                    className={`sidebar-btn text-start ${activeTab === "myProducts" ? "active-tab" : ""}`}
                    onClick={fetchUserProducts}
                  >
                    My Products
                  </button>
                  <button
                                      className={`sidebar-btn text-start ${
                                        activeTab === "myCart" ? "active-tab" : ""
                                      }`}
                                     onClick={async () => {
                                        setActiveTab("myCart");
                                        if (mongoId) await logEvent({ userId: mongoId, eventType: "cart" });
                                      }}
                                    >
                                      My Cart
                                    </button>
                  <button
                                      className={`sidebar-btn text-start ${
                                        activeTab === "wishlist" ? "active-tab" : ""
                                      }`}
                                      onClick={async () => {
                                        setActiveTab("wishlist");
                                        if (mongoId) await logEvent({ userId: mongoId, eventType: "wishlist" });
                                      }}
                                    >
                                      My Wishlist
                                    </button>

                   {/*chat Dashboard for seller*/}
                  <button
                    className="sidebar-btn "
                    onClick={handleNotification}
                  >
                    Chat Dashboard
                  </button>
                  <button
                    className={`sidebar-btn text-start ${activeTab === "wishlist" ? "active-tab" : ""}`}
                    onClick={() => setActiveTab("wishlist")}
                  >

                 

                    My Wishlist
                  </button>
                  <button
                    className="btn btn-light text-start text-danger mt-2"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="col-md-8">
              {message && <div className="alert alert-info">{message}</div>}

              {activeTab === "profileInfo" && (
                <div className="card p-4">
                  <h4>Profile Information</h4>
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>About Me:</strong> {formData.aboutMe}</p>
                  <p><strong>City:</strong> {formData.city}</p>
                  <p><strong>State:</strong> {formData.state}</p>
                </div>
              )}



               {activeTab === "updateProfile" && (
                <form className="card p-4" onSubmit={handleUpdateProfile}>
                  <h4>Update Profile</h4>
                  <div className="mb-3">
                    <input type="text" name="name" className="form-control" placeholder="Enter your name" value={formData.name} onChange={handleChange} />
                  </div>
                  <div className="mb-3">
                    <input type="text" name="phone" className="form-control" placeholder="Phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="mb-3">
                    <textarea name="aboutMe" className="form-control" placeholder="About me..." value={formData.aboutMe} onChange={handleChange} />
                  </div>

                  <div className="mb-3">
  <input
    type="text"
    name="upiId"
    className="form-control"
    placeholder="Your UPI ID (e.g., ravi@okhdfcbank)"
    value={formData.upiId}
    onChange={handleChange}
  />
  <small className="text-muted">
    Optional — buyers can pay you directly using this UPI ID.
  </small>
</div>


                  <div className="mb-3 d-flex gap-3">
                    <div className="form-check">
                      <input type="radio" className="form-check-input" checked={formData.locationMode === "manual"} onChange={() => setFormData({ ...formData, locationMode: "manual" })} />
                      <label className="form-check-label">Manual</label>
                    </div>
                    <div className="form-check">
                      <input type="radio" className="form-check-input" checked={formData.locationMode === "gps"} onChange={() => setFormData({ ...formData, locationMode: "gps" })} />
                      <label className="form-check-label">GPS</label>
                    </div>
                  </div>

                  {formData.locationMode === "manual" && (
                    <>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <input type="text" name="city" className="form-control" placeholder="City" value={formData.city} onChange={handleChange} />
                        </div>
                        <div className="col-md-6 mb-3">
                          <input type="text" name="state" className="form-control" placeholder="State" value={formData.state} onChange={handleChange} />
                        </div>
                      </div>
                      <input type="text" name="address" className="form-control mb-3" placeholder="Address" value={formData.manualLocation.address} onChange={handleManualLocationChange} />
                      <input type="text" name="pincode" className="form-control mb-3" placeholder="Pincode" value={formData.manualLocation.pincode} onChange={handleManualLocationChange} />
                    </>
                  )}

                  {formData.locationMode === "gps" && (
                    <div className="mb-3">
                      <button type="button" className="btn" onClick={handleGetGPS}>Get My GPS Location</button>
                      {formData.gpsLocation.coordinates[0] !== 0 && (
                        <p className="mt-2">Lat: {formData.gpsLocation.coordinates[1]}, Lng: {formData.gpsLocation.coordinates[0]}</p>
                      )}
                    </div>
                  )}

                  <button type="submit" className="btn w-100">Save Changes</button>
                </form>
              )}

              {showChatDashboard && (
  <div className="chat-dashboard-wrapper mt-4 card shadow-sm border-0 rounded-3 p-3">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="mb-0">Chat Dashboard</h5>
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={() => setShowChatDashboard(false)}
      >
        ✖ Close
      </button>
    </div>

    {!mongoId ? (
      <p className="text-muted">Loading your chats...</p>
    ) : (
      <ChatDashboard currentUserId={mongoId} />
    )}
  </div>
)}

{activeTab === "myCart" && (
                <div className="card p-4">
                  <h4 className="mb-3">My Cart</h4>

                  {cartItems.length === 0 ? (
                    <p>No items in your cart.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Title</th>
                            <th>Price</th>
                            <th>Buy</th>
                            <th>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((item) => (
                            <tr key={item._id}>
                              <td style={{ width: "80px" }}>
                                <img
                                  src={
                                    // Handle both formats: { url: "..."} or just "..."
                                    item.productId?.photos?.[0]?.url ||
                                    item.productId?.photos?.[0] ||
                                    "/defaultBG.jpg"
                                  }
                                  alt={item.productId?.title}
                                  className="img-fluid rounded"
                                  style={{
                                    maxWidth: "70px",
                                    maxHeight: "70px",
                                  }}
                                />
                              </td>
                              <td>{item.productId?.title}</td>
                              <td>₹{item.productId?.price}</td>
                              <td>
                                <button
                                  className="btn"
                                  onClick={() =>
                                    alert(`Buying ${item.productId?.title}`)
                                  }
                                >
                                  <FiShoppingBag />
                                </button>
                              </td>
                              <td>
                                <button
                                  className="btn"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        `http://localhost:5000/api/cart/${mongoId}/${item.productId._id}`,
                                        { method: "DELETE" }
                                      );
                                      const data = await res.json();
                                      if (!res.ok)
                                        throw new Error(
                                          data.message || "Failed to remove"
                                        );
                                      setCartItems(
                                        cartItems.filter(
                                          (c) =>
                                            c.productId._id !==
                                            item.productId._id
                                        )
                                      );
                                    } catch (err) {
                                      alert(
                                        "Error removing item: " + err.message
                                      );
                                    }
                                  }}
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "wishlist" && <Wishlist />}

{/* My Products (Seller Payment Integration) */}
           {activeTab === "myProducts" && (
  <div className="products-section">
    <h4>My Products</h4>
    {productsLoading ? (
      <p>Loading...</p>
    ) : userProducts.length === 0 ? (
      <p>No products yet.</p>
    ) : (
      <div className="row g-3">
        {userProducts.map((p) => {
          const payment = getPaymentForProduct(p._id);
          return (
            <div key={p._id} className="col-md-6">
              <div className="card h-100">
                <img
                  src={p.photos?.[0] || DEFAULT_PRODUCT_IMAGE}
                  alt={p.title}
                  onError={(e) => (e.target.src = DEFAULT_PRODUCT_IMAGE)}
                />
                <div className="card-body">
                  <h5>{p.title}</h5>
                  <p className="text-success">₹ {p.price}</p>
                  <p className="small text-muted">
                    {p.description?.substring(0, 60) || "No description"}...
                  </p>
                  <button
                    className="btn btn-primary w-100 mb-2"
                    onClick={() => navigate(`/product/${p._id}`)}
                  >
                    View Details
                  </button>

                  {/* ✅ Payment Status Section */}
                  {payment ? (
                    <>
                      {payment.status === "buyer_confirmed" && (
                        <>
                          <p className="text-warning mb-1">
                            💰 Buyer marked as paid (₹{payment.amount})
                          </p>
                          <button
                            className="btn btn-success btn-sm w-100"
                            onClick={async () => {
                              await axios.post(
                                "http://localhost:5000/api/paymentStatus/seller-confirm",
                                {
                                  productId: p._id,
                                  buyerId: payment.buyerId._id,
                                  sellerId: mongoId,
                                }
                              );
                              alert("✅ Payment marked as received!");
                              window.location.reload();
                            }}
                          >
                            Mark as Received
                          </button>
                        </>
                      )}

                      {payment.status === "completed" && (
                        <p className="text-success mb-0">
                          ✅ Payment received and completed
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted small mb-0">
                      No payment activity yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}



             
              

              
            </div>
          </div>
        ) : (
          <p className="text-center mt-5">You are not logged in.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
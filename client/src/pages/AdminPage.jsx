// AdminPage.jsx
import React, { useState } from "react";
import "./AdminPage.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ProductStats from "../Component/ProductStats";
import UsersCollection from "../Component/UsersCollection";
import ProductsCollection from "../Component/ProductsCollection";
import CollectionsHome from "../Component/CollectionsHome";
import DashboardHome from "../Component/DashboardHome";


export default function AdminPage() {
  const navigate = useNavigate();
  const [activeComponent, setActiveComponent] = useState("dashboard");

  // ---------------- TOP BAR FUNCTIONS ----------------
  const handlePasswordUpdate = async () => {
    try {
      const email = prompt("Enter admin email:");
      if (!email) return alert("Email required");

      const res = await axios.put(
        "http://localhost:5000/api/admin/update-password",
        { email }
      );

      alert(res.data.message);
    } catch (err) {
      alert("Error updating password");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminId");
    sessionStorage.clear();
    navigate("/adminlogin");
  };

  // ---------------- COMPONENT RENDERER ----------------
  const renderComponent = () => {
    switch (activeComponent) {
      case "dashboard":
        return <DashboardHome />;
      case "collections":
        return <CollectionsHome />;
      case "stats":
        return <ProductStats onClose={() => setActiveComponent("dashboard")} />;
      case "users":
        return <UsersCollection />;
      case "products":
        return <ProductsCollection />;
      
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="admin-container">

      {/* ---------------- SIDEBAR ---------------- */}
      <aside className="sidebar">
        <h2 className="sidebar-title">SmartCart Admin</h2>

        <ul className="menu-list">
          <li
            onClick={() => setActiveComponent("dashboard")}
            className={activeComponent === "dashboard" ? "active" : ""}
          >
            📊 Dashboard
          </li>

          <li
            onClick={() => setActiveComponent("collections")}
            className={activeComponent === "collections" ? "active" : ""}
          >
            🗂 Collections
          </li>

          <li
            onClick={() => setActiveComponent("stats")}
            className={activeComponent === "stats" ? "active" : ""}
          >
            📈 Analytics / Stats
          </li>

          <li
            onClick={() => setActiveComponent("users")}
            className={activeComponent === "users" ? "active" : ""}
          >
            👤 Users
          </li>

          <li
            onClick={() => setActiveComponent("products")}
            className={activeComponent === "products" ? "active" : ""}
          >
            🛒 Products
          </li>

          
        </ul>
      </aside>

      {/* ---------------- MAIN AREA ---------------- */}
      <main className="main-area">
        <div className="topbar">
          <h2 className="project-name">SmartCart Dashboard</h2>

          <div className="topbar-actions">
            <button onClick={handlePasswordUpdate} className="top-btn">
              Update Password
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="content-area">{renderComponent()}</div>
      </main>
    </div>
  );
}

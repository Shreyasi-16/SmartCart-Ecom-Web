import React, { useEffect, useState } from "react";
import axios from "axios";
import "./DashboardHome.css";

export default function DashboardHome() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // FETCH PRODUCTS
      const p = await axios.get("http://localhost:5000/products/stats");
      setTotalProducts(p.data.data.totalCount);

      // FETCH USERS
      const u = await axios.get("http://localhost:5000/count");
      setTotalUsers(u.data.totalUsers);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setLoading(false);
    }
  };

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div className="dashboard-container">

      <h2 className="dash-title">Dashboard</h2>

      {/* TOP CARDS */}
      <div className="dash-cards">

        {/* Total Products */}
        <div className="dash-card card1">
          <h4>Total Products</h4>
          <h2>{totalProducts}</h2>
          <p className="sub-text up">Live Count</p>
        </div>

        {/* Total Users */}
        <div className="dash-card card2">
          <h4>Total Users</h4>
          <h2>{totalUsers}</h2>
          <p className="sub-text up">Live Count</p>
        </div>

      </div>

    </div>
  );
}

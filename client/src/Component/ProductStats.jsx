import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

import "./ProductStats.css";

export default function ProductStats() {
  const [stats, setStats] = useState(null);
  const [userGraph, setUserGraph] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchUserGraph();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/products/stats");
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.log("Error fetching stats:", err);
    }
  };

  const fetchUserGraph = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/monthly");
      setUserGraph(res.data.data || []);
    } catch (err) {
      console.log("User graph error:", err);
    }
  };

  if (!stats) return <p style={{ padding: "20px" }}>Loading stats…</p>;

  return (
    <div className="stats-dashboard">

      {/* -------- GRID OF 4 CHART BOXES -------- */}
      <div className="stats-grid">

        {/* -------- Chart 1: Category-wise chart -------- */}
<div className="stats-card">
  <h3>Products by Category</h3>
  <ResponsiveContainer width="100%" height={260}>
    <BarChart data={stats.byCategory}>
      <CartesianGrid strokeDasharray="3 3" />

      {/* ❌ Hide X axis labels */}
      <XAxis dataKey="category" tick={false} />

      <YAxis />
      <Tooltip formatter={(value, name, props) => [`${value}`, `Category: ${props.payload.category}`]} />

      <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>


{/* -------- Chart 2: State-wise chart -------- */}
<div className="stats-card large-card">
  <h3>Products by State</h3>

  <div className="pie-wrapper">
    <ResponsiveContainer width="60%" height={300}>
      <PieChart>
        <Pie
          data={stats.byState}
          dataKey="total"
          nameKey="_id"
          label={({ name }) => name} // show label on pie
          outerRadius={120}
        >
          {stats.byState.map((entry, index) => (
            <Cell key={index} fill={randomColor()} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>

    {/* Scrollable legend box */}
    <div className="legend-box">
      {stats.byState.map((entry, i) => (
        <div key={i} className="legend-item">
          <span
            className="legend-color"
            style={{ background: randomColor() }}
          />
          {entry._id} – {entry.total}
        </div>
      ))}
    </div>
  </div>
</div>

        {/* -------- Chart 3: Verification Status -------- */}
{/* -------- Chart 3: Verification Status -------- */}
<div className="stats-card">
  <h3>Verification Status</h3>
  <ResponsiveContainer width="100%" height={250}>
    <BarChart
      data={stats.byVerificationStatus.map(item => {
        let label = item._id;

        if (item._id === true) label = "Verified";
        else if (item._id === false) label = "Not Verified";
        else if (item._id === "documentUploaded") label = "Document Uploaded";
        else if (item._id === "suspect") label = "Suspect";

        return { ...item, label };
      })}
    >
      <CartesianGrid strokeDasharray="3 3" />

      {/* Readable X-axis labels */}
      <XAxis dataKey="label" />

      <YAxis />
      <Tooltip />
      <Bar dataKey="total" fill="#a855f7" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>


      </div>
    </div>
  );
}


// -------- Random color generator (for Pie chart) --------
function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)},70%,60%)`;
}

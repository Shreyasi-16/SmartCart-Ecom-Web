// src/components/MainCardLayout.jsx
import React from "react";
import "./MainCardLayout.css";

export function MainCardLayout({ children }) {
  return (
    <div className="main-card">
      {children}
    </div>
  );
}

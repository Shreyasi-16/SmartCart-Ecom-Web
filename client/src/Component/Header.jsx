import React from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";

export function Header() {
  return (
    <header className="header-section">
      {/* Background image */}
      <div className="header-bg">
        {/* Overlay */}
        <div className="header-overlay">
          {/* Navbar */}
          <nav className="navbar navbar-expand-lg navbar-dark px-5">
            <NavLink className="navbar-brand d-flex align-items-center" to="/">
              <img
                src="/logo.png"
                alt="logo"
                height="70"
                width="70"
                className="me-2 rounded-circle"
              />
              <span className="brand-text">SmartCart</span>
            </NavLink>

            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <NavLink exact="true" to="/" className="nav-link">
                    Home
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/product" className="nav-link">
                    Product
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/contact" className="nav-link">
                    Contact
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/cart" className="nav-link">
                    Cart
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/signup" className="nav-link">
                    Signup
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/login" className="nav-link">
                    Login
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/sell" className="nav-link">
                    Sell
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/profile" className="nav-link">
                    Profile
                  </NavLink>
                </li>
              </ul>
            </div>
          </nav>

          
        </div>
      </div>
    </header>
  );
}

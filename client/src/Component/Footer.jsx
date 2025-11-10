import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        {/* About Section */}
        <div className="footer-column">
          <h3>SmartCart</h3>
          <ul> 
            <li><a href="/Aboutus">About Us</a></li>
            
          </ul>
          <p>SmartCart is your trusted marketplace for buying and selling items.</p>
          <p>Email: smartcartscet@gmail.com</p>
          <p>Phone: +91 7285847414</p>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/Sell">Sell an Item</a></li>
            <li><a href="/Profile">My Account</a></li>
            <li><a href="/Cart">My Cart</a></li>
          </ul>
        </div>

        {/* Support */}
        <div className="footer-column">
          <h3>Support</h3>
          <ul> 
            <li><a href="/Contact">Contact Us</a></li>
            
          </ul>
        </div>

        {/* Legal & Social */}
        <div className="footer-column">
          <h3>Our Socials</h3>
          <div className="social-icons">
            <a href="#"><img src="/facebook.png" alt="Facebook" /></a>
            <a href="#"><img src="/twitter.png" alt="Twitter" /></a>
            <a href="#"><img src="/instagram2.png" alt="Instagram" /></a>
            <a href="#"><img src="/linkedin.png" alt="LinkedIn" /></a>
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="footer-bottom">
        <p>&copy;SmartCart. All rights reserved.</p>
      </div>
    </footer>
  );
}

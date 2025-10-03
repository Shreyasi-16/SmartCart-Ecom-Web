import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import "./Contact.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const form = useRef();

  // Update state on input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Handle form submission with EmailJS
  const handleSubmit = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_23rvrbj",   // replace with your EmailJS service ID
        "template_uvgjtqp",  // replace with your EmailJS template ID
        form.current,
        "vyTYDH3iukIZdKVD3"    // replace with your EmailJS public key
      )
      .then(
        () => {
          alert("Message sent successfully!");
          setFormData({ name: "", email: "", subject: "", message: "" });
        },
        (error) => {
          console.error(error);
          alert("Failed to send message. Please try again.");
        }
      );
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>
          We’d love to hear from you! Fill out the form below and we’ll get back
          to you as soon as possible.
        </p>
      </div>

      <div className="contact-content">
        {/* Contact Form */}
        <div className="contact-form-card">
          <form ref={form} onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="Your Message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <button type="submit" className="submit-btn">
              Send Message
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="contact-info">
          <div className="info-card">
            <h3>Our Contact</h3>
            <p>
              Email:{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(
                    "https://mail.google.com/mail/?view=cm&fs=1&to=smartcartscet@gmail.com",
                    "_blank"
                  );
                }}
              >
                smartcartscet@gmail.com
              </a>
            </p>
            <p>
              Phone: <a href="tel:+917285837414">+91 72858 37414</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

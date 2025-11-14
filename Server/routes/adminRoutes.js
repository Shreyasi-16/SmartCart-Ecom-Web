// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

//  Admin Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful", adminId: admin._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update Password & Send Email
router.put("/update-password", async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Generate random new password
    const newPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(newPassword, 10);
    admin.password = hashed;
    await admin.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL, // your gmail id
        pass: process.env.ADMIN_EMAIL_PASS, // your app password
      },
    });

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: admin.email,
      subject: "Admin Password Updated",
      text: `Your new admin password is: ${newPassword}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password updated and sent to admin email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

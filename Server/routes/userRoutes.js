const express = require("express");
const authenticate = require("../middleware/authenticate");
const { syncUser } = require("../services/userService");
const User = require("../models/User");   // ✅ REQUIRED
const router = express.Router();

router.get("/count", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ success: true, totalUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching users count" });
  }
});

const basePath = "/api/users";

// GET all users
router.get(`${basePath}/all`, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// DELETE user
router.delete(`${basePath}/delete/:id`, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// Keep the exact original path:
router.post("/sync-user", authenticate, syncUser);

module.exports = router;

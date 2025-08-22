const express = require("express");
const authenticate = require("../middleware/authenticate");
const { syncUser } = require("../services/userService");

const router = express.Router();

// Keep the exact original path:
router.post("/sync-user", authenticate, syncUser);

module.exports = router;

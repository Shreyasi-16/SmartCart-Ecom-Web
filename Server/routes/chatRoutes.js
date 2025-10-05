// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { getChatsByUser } = require("../controllers/chatController");

router.get("/user/:userId", getChatsByUser);

module.exports = router;

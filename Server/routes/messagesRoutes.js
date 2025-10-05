const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getChatById,
} = require("../controllers/messageController");

// POST new message
router.post("/", sendMessage);

// GET single chat by chatId
router.get("/chat/:chatId", getChatById);

module.exports = router;

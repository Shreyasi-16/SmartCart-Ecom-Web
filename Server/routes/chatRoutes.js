// routes/chatRoutes.js
const express = require("express");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log(
"Cloudinary ENV:",
process.env.CLOUDINARY_CLOUD_NAME,
process.env.CLOUDINARY_API_KEY ? "API key set" : "MISSING"
);

// 1️⃣ Create or get chat for a product
router.post("/init", async (req, res) => {
const { productId, buyerId, sellerId } = req.body;

if (!productId || !buyerId || !sellerId) {
return res.status(400).json({ message: "productId, buyerId, sellerId are required" });
}

try {
let chat = await Chat.findOne({ product: productId, buyer: buyerId, seller: sellerId });
if (!chat) {
chat = await Chat.create({ product: productId, buyer: buyerId, seller: sellerId });
}
res.json(chat);
} catch (err) {
console.error("Chat init server error:", err);
res.status(500).json({ message: "Server error" });
}
});

// 2️⃣ Send message (text + file)
router.post("/:chatId/message", async (req, res) => {
const { chatId } = req.params;
const { senderId, text } = req.body;

if (!chatId || !senderId) {
return res.status(400).json({ message: "chatId and senderId are required" });
}

try {
let fileUrl = null;
let fileType = null;
let fileName = null;


if (req.files && req.files.file) {
  const file = req.files.file;
  const uploadOptions = file.mimetype.startsWith("image/")
    ? {}
    : { resource_type: "raw" };

  const result = await cloudinary.uploader.upload(file.tempFilePath, uploadOptions);

  fileUrl = result.secure_url;
  fileType = file.mimetype;
  fileName = file.name;
}

const message = await Message.create({
  chat: chatId,
  sender: senderId,
  text,
  fileUrl,
  fileType,
  fileName,
});

res.json(message);


} catch (err) {
console.error("Message send server error:", err);
res.status(500).json({ message: "Failed to send message" });
}
});

// 3️⃣ Get all messages for a chat
router.get("/:chatId/messages", async (req, res) => {
const { chatId } = req.params;

try {
const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });
res.json(messages);
} catch (err) {
console.error("Fetch messages server error:", err);
res.status(500).json({ message: "Failed to fetch messages" });
}
});

module.exports = router;

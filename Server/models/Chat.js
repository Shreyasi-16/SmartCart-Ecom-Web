const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, unique: true }, // e.g., buyerId_sellerId_productId
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: String, default: "" },
    unreadCountBuyer: { type: Number, default: 0 },
    unreadCountSeller: { type: Number, default: 0 },
  },
  { timestamps: true } // adds createdAt & updatedAt
);

module.exports = mongoose.model("Chat", chatSchema);

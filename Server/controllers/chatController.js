// server/controllers/chatController.js
const Chat = require("../models/Chat");
const User = require("../models/User");

// Get all chats for a user (buyer or seller)
exports.getChatsByUser = async (req, res) => {
  try {
    const { userId } = req.params; // Firebase UID

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Find MongoDB user by Firebase UID
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found in database" });
    }

    const mongoUserId = user._id;

    // Fetch chats where this user is buyer or seller
    const chats = await Chat.find({
      $or: [{ buyerId: mongoUserId }, { sellerId: mongoUserId }],
    })
      .sort({ updatedAt: -1 })
      .populate("productId", "title") // product title
      .populate("buyerId", "uid")
      .populate("sellerId", "uid");

    // Format response for frontend
    const formattedChats = chats.map((chat) => ({
      chatId: chat._id,
      product: chat.productId,
      buyerId: chat.buyerId?._id,
      buyerUid: chat.buyerId?.uid,
      sellerId: chat.sellerId?._id,
      sellerUid: chat.sellerId?.uid,
      lastMessage: chat.lastMessage || "", // ✅ fixed
      unreadCountBuyer: chat.unreadCountBuyer || 0,
      unreadCountSeller: chat.unreadCountSeller || 0,
    }));

    res.json(formattedChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const Message = require("../models/Message");
const Chat = require("../models/Chat");

// Save a new message and update Chat
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, productId, buyerId, sellerId, senderId, receiverId, message } = req.body;

    // Save the message
    const newMessage = new Message({
      chatId,
      productId,
      buyerId,
      sellerId,
      senderId,
      receiverId,
      message,
    });
    await newMessage.save();

    // Update or create the Chat
    let chat = await Chat.findOne({ chatId });
    if (!chat) {
      chat = new Chat({
        chatId,
        productId,
        buyerId,
        sellerId,
      });
    }

    // Update last message
    chat.lastMessage = message;

    // Update unread count
    if (receiverId.toString() === buyerId.toString()) {
      chat.unreadCountBuyer += 1;
    } else if (receiverId.toString() === sellerId.toString()) {
      chat.unreadCountSeller += 1;
    }

    await chat.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all messages for a chat by chatId
exports.getChatById = async (req, res) => {
  const { chatId } = req.params;
  const messages = await Message.find({ chatId });
  res.json(messages); // remove 404 for testing
};


// (Optional) Get all chats for a specific user (buyer or seller)
exports.getChatsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const chats = await Chat.find({
      $or: [{ buyerId: userId }, { sellerId: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");

    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true }, // unique chatid= buyerId_sellerId_productId
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyerId: { type: String, required: true },  
    sellerId: { type: String, required: true },  
    senderId: { type: String, required: true }, 
    receiverId: { type: String, required: true },

    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

module.exports = mongoose.model("Message", messageSchema);

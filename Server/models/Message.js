const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text:  String ,
    fileUrl:  String ,   // can store both image or pdf
    fileType:  String ,  // e.g. "image/png", "application/pdf"
    fileName: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);

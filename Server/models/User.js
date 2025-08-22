const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: String,
    name: String,
    email: String,
    phone: String,
    photoURL: String,
    joinedAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const PaymentStatusSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "buyer_confirmed", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentStatus", PaymentStatusSchema);

// models/Review.js
const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // Foreign keys (stored as strings in your DB today)
    sellerId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true },
    productId: { type: String, required: true },

    // One review per completed order
    orderId: { type: String, required: true, unique: true },

    // Buyer-visible fields
    title: { type: String, default: "Untitled review", trim: true },
    publicName: { type: String, required: true, trim: true }, // shown in UI

    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "", trim: true },

    // Optional granular sub-ratings for your UI copy
    productQuality: { type: Number, min: 1, max: 5, default: null },
    deliveryRating: { type: Number, min: 1, max: 5, default: null },
    sellerComm: { type: Number, min: 1, max: 5, default: null },

    // Purchase signals
    verifiedPurchase: { type: Boolean, default: true },
    deliveryTimeDays: { type: Number, default: null },
    wasDelayed: { type: Boolean, default: false },
    refundRequested: { type: Boolean, default: false },
    refundApproved: { type: Boolean, default: false },
    disputeRaised: { type: Boolean, default: false },

    // Analytics hooks (kept from your previous schema)
    sentimentScore: { type: Number, default: null }, // -1..+1
    aspects: {
      productQuality: { type: Number, default: null },
      shipping: { type: Number, default: null },
      communication: { type: Number, default: null },
      refundHandling: { type: Number, default: null },
    },
    fraudKeywordsScore: { type: Number, default: null },
    toxicityScore: { type: Number, default: null },
    fraudFlags: {
      possibleScam: { type: Boolean, default: false },
      nonDelivery: { type: Boolean, default: false },
      fakeProduct: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Helpful compound indexes for listing & stats
ReviewSchema.index({ sellerId: 1, createdAt: -1 });
ReviewSchema.index({ sellerId: 1, productId: 1, createdAt: -1 });
ReviewSchema.index({ sellerId: 1, rating: 1 });

module.exports = mongoose.model("Review", ReviewSchema);

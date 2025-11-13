const mongoose = require("mongoose");

const UserRecommendationsSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // this stores your MongoDB _id as a string
      required: true,
      unique: true,
    },
    recommendations: [
      {
        _id: String,
        title: String,
        price: Number,
        thumbnail: String,
        photos: [
          {
            url: String,
          },
        ],
        category: String,
      },
    ],
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "user_recommendations" }
);

module.exports = mongoose.model(
  "UserRecommendations",
  UserRecommendationsSchema
);

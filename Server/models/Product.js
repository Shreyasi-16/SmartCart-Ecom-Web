const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  categoryId: String,
  title: String,
  description: String,
  price: String,
  state: String,
  city: String,
  
  attributes: Object,
  photos: [String],
  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Products", productSchema);

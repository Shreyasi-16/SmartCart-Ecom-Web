const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// ✅ Add to cart
router.post("/", cartController.addToCart);

// ✅ Get all cart items for a user
router.get("/:userId", cartController.getCart);

// ✅ Remove a specific item from cart (by userId + productId)
router.delete("/:userId/:productId", cartController.removeFromCart);

// ✅ Update quantity of an item in cart
router.put("/:userId/:productId", cartController.updateQuantity);

module.exports = router;

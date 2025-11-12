const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");

// Create new verification
router.post("/", verificationController.createOrUpdateVerification);


// Get all
router.get("/", verificationController.getAllVerifications);

// Get by ID
router.get("/:id", verificationController.getVerificationById);

// Update document info (like uploadedFiles or scanResult)
router.put("/:id", verificationController.updateVerification);

// Update status only
router.patch("/:id/status", verificationController.updateStatus);

// Delete
router.delete("/:id", verificationController.deleteVerification);

module.exports = router;

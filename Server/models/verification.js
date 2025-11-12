const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    sellerId: { type: String, ref: "User", required: true },
    categoryId: { type: Number, required: true },
    productTitle: { type: String, required: false },

    // Uploaded files (URLs)
    uploadedFiles: {
      rcbook: { type: String, default: null },        // car/bike
      insurance: { type: String, default: null },     // car/bike
      puc: { type: String, default: null },           // car/bike
      noc: { type: String, default: null },           // car/bike loan
      warranty: { type: String, default: null },      // car/bike/electronics/others
      aadhaar: { type: String, default: null },       // car/bike
      bill: { type: String, default: null },          // electronics, others
      registration: { type: String, default: null },  // pets
    },

    // Python OCR / AI scan result (JSON from Flask or OCR.space)
    scanResult: {
      type: Object,
      default: {},
    },

    // Status of the verification
    status: {
      type: String,
      enum: ["pending", "verified", "Document Uploaded", "suspect"],
      default: "pending",
    },

    // Notes or admin comments
    remarks: { type: String, default: "" },

    

    // Timestamp for auditing
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "VerificationDocument",
  verificationSchema,
  "verification_documents"
);

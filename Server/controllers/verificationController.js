const VerificationDocument = require("../models/verification");
const axios = require("axios");

//  Create new verification

exports.createOrUpdateVerification = async (req, res) => {
  try {
    let { sellerId, categoryId, uploadedFiles, remarks, productTitle } = req.body;

    if (!sellerId || !categoryId) {
      return res.status(400).json({ error: "sellerId and categoryId required" });
    }

    //  Remove unwanted field if frontend accidentally sends it
    if (uploadedFiles && uploadedFiles.insurancePassword) {
      delete uploadedFiles.insurancePassword;
    }

    // Check if existing
    const existingVerification = await VerificationDocument.findOne({
      sellerId,
      verificationId: { $ne: null },
    });

    let newVerification;
    if (existingVerification) {
      existingVerification.uploadedFiles = uploadedFiles;
      existingVerification.remarks = remarks;
      existingVerification.productTitle = productTitle;
      await existingVerification.save();
      newVerification = existingVerification;
    } else {
      newVerification = new VerificationDocument({
        sellerId,
        categoryId,
        uploadedFiles,
        remarks,
        productTitle,
      });
      await newVerification.save();
    }

    //  Trigger Flask OCR
    try {
  const ocrResponse = await axios.post(`http://127.0.0.1:8000/ocr/extract_text/${newVerification._id}`);
  console.log(" OCR triggered successfully for:", newVerification._id);
} catch (err) {
  console.error(" OCR trigger failed:", err.message);
}

    res.status(201).json(newVerification);
  } catch (error) {
    console.error("Error in createOrUpdateVerification:", error);
    res.status(500).json({ error: error.message });
  }
};

//  Get all
exports.getAllVerifications = async (req, res) => {
  try {
    const all = await VerificationDocument.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get by ID
exports.getVerificationById = async (req, res) => {
  try {
    const item = await VerificationDocument.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update document info
exports.updateVerification = async (req, res) => {
  try {
    const updated = await VerificationDocument.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Update status only
exports.updateStatus = async (req, res) => {
  try {
    const updated = await VerificationDocument.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete
exports.deleteVerification = async (req, res) => {
  try {
    await VerificationDocument.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

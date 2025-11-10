const express = require("express");
const router = express.Router();

// Utility to safely build UPI link
function buildUpiLink({ pa, pn, am, tn }) {
  const params = [
    `pa=${encodeURIComponent(pa)}`,
    pn ? `pn=${encodeURIComponent(pn)}` : "",
    am ? `am=${encodeURIComponent(String(am))}` : "",
    `cu=INR`,
    tn ? `tn=${encodeURIComponent(tn)}` : ""
  ].filter(Boolean).join("&");

  return `upi://pay?${params}`;
}

// Create UPI link (no saving anywhere)
router.post("/generate", async (req, res) => {
  try {
    const { upiId, name, amount, title } = req.body;

    if (!upiId || !amount) {
      return res.status(400).json({ error: "UPI ID and amount required" });
    }

    // Basic validation
    const valid = /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(upiId);
    if (!valid) return res.status(400).json({ error: "Invalid UPI format" });

    // Build link
    const upiLink = buildUpiLink({
      pa: upiId,
      pn: name || "Seller",
      am: amount,
      tn: title || "Product Payment",
    });

    // Return link only — nothing stored
    res.json({ upiLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

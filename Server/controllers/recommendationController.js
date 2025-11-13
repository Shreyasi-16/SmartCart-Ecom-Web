const axios = require("axios");

// Default to IPv4 localhost to avoid ::1 IPv6 resolution issues.
// Allow override via FLASK_BASE env var (e.g. for Docker or remote host).
const FLASK_BASE = process.env.FLASK_BASE || "http://127.0.0.1:5001";

// Helper: remove heavy fields (embedding) before returning to client
function sanitizeProducts(products = [], { removeEmbedding = true } = {}) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => {
    const copy = { ...p };
    if (removeEmbedding && copy.embedding) delete copy.embedding;
    return copy;
  });
}

exports.getRecommendations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    // axios config: timeout and optional headers
    const axiosConfig = {
      params: { user_id: String(userId), n: 10 },
      timeout: 10000, // 10s
      // If you need to force IPv4 at lower levels, ensure FLASK_BASE uses 127.0.0.1
    };

    let response;
    try {
      response = await axios.get(`${FLASK_BASE}/recommend`, axiosConfig);
    } catch (err) {
      // Network / timeout / non-2xx errors
      console.error("⚠️ Error contacting Flask:", err.code || err.message, err.response?.status);
      if (err.code === "ECONNREFUSED") {
        return res.status(502).json({ message: "Upstream service refused connection", detail: err.message });
      }
      if (err.code === "ECONNABORTED") {
        return res.status(504).json({ message: "Upstream request timed out" });
      }
      // If axios returned a response (non-2xx), forward useful details
      if (err.response) {
        const status = err.response.status || 502;
        const body = err.response.data;
        return res.status(502).json({ message: "Upstream returned error", status, body });
      }
      return res.status(500).json({ message: "Failed to contact upstream", error: err.message });
    }

    // Ensure upstream returned ok and has expected shape
    if (!response || typeof response.status === "undefined") {
      return res.status(502).json({ message: "Invalid upstream response" });
    }
    if (response.status < 200 || response.status >= 300) {
      return res.status(502).json({ message: "Upstream non-OK status", status: response.status, body: response.data });
    }

    const recs = Array.isArray(response.data?.recommendations) ? response.data.recommendations : [];
    const sanitized = sanitizeProducts(recs, { removeEmbedding: true });

    return res.json({
      success: true,
      source: response.data?.source || "flask",
      count: response.data?.count ?? sanitized.length,
      recommendations: sanitized,
    });
  } catch (err) {
    console.error("❌ Recommendation error (handler):", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

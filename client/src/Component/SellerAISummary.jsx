import { useEffect, useState } from "react";

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

export default function SellerAISummary({ sellerId }) {
  const [summary, setSummary] = useState(null);
  const [totalReviews, setTotalReviews] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState(null);

  // Load initial summary only if seller has reviews
  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/reviews/seller/${sellerId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((reviewData) => {
        const reviewCount =
          reviewData.count ||
          reviewData.totalReviews ||
          (reviewData.reviews?.length || 0);

        if (reviewCount === 0) {
          // 🚫 No reviews, skip AI fetch
          setSummary("No reviews yet for this seller.");
          setTotalReviews(0);
          setLoading(false);
          return;
        }

        // ✅ Fetch AI summary if reviews exist
        fetch(`${API_BASE}/api/ai/summary/${sellerId}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          })
          .then((data) => {
            setSummary(data.summary || "No summary available.");
            setTotalReviews(data.totalReviews ?? reviewCount);
          })
          .catch((e) => setError(e.message || "Failed to load AI summary."))
          .finally(() => setLoading(false));
      })
      .catch((err) => {
        console.error("Error checking seller reviews:", err);
        setError("Failed to load review data.");
        setLoading(false);
      });
  }, [sellerId]);

  // ✅ Fix: prevent recompute when no reviews exist
  const recompute = async () => {
    if (!sellerId) return;
    setRecomputing(true);
    setError(null);

    try {
      // Step 1: Check if reviews exist first
      const reviewRes = await fetch(`${API_BASE}/api/reviews/seller/${sellerId}`);
      if (!reviewRes.ok) throw new Error(await reviewRes.text());
      const reviewData = await reviewRes.json();
      const reviewCount =
        reviewData.count ||
        reviewData.totalReviews ||
        (reviewData.reviews?.length || 0);

      if (reviewCount === 0) {
        // 🚫 Stop recompute if no reviews exist
        setSummary("No reviews yet for this seller.");
        setTotalReviews(0);
        setRecomputing(false);
        return;
      }

      // Step 2: Trigger AI recompute only if reviews exist
      const res = await fetch(`${API_BASE}/api/ai/analyze-reviews/${sellerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSummary(data.aiSummary || "No summary available.");
      setTotalReviews(reviewCount);
    } catch (e) {
      console.error("AI recompute error:", e);
      setError(e.message || "Failed to recompute summary");
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <section className="ai-summary-card" style={styles.card}>
      <div style={styles.headerRow}>
        <h3 style={styles.title}>Seller review summary (AI)</h3>
        <button
          onClick={recompute}
          disabled={recomputing || !sellerId || totalReviews === 0}
          style={{
            ...styles.button,
            ...(totalReviews === 0 ? styles.buttonDisabled : {}),
          }}
          title={
            totalReviews === 0
              ? "No reviews to analyze"
              : "Recompute from latest reviews"
          }
        >
          {recomputing ? "Recomputing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading summary…</p>
      ) : error ? (
        <p style={styles.error}>Error: {error}</p>
      ) : (
        <>
          <p style={styles.summary}>{summary}</p>
          {typeof totalReviews === "number" && totalReviews > 0 && (
            <p style={styles.muted}>
              Based on {totalReviews} review{totalReviews === 1 ? "" : "s"}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

const styles = {
  card: {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    marginTop: 12,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { margin: 0, fontSize: 16 },
  button: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    cursor: "pointer",
    background: "#f7f7f7",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  muted: { color: "#666", marginTop: 8, fontSize: 13 },
  summary: { marginTop: 8, lineHeight: 1.5 },
  error: { color: "red", marginTop: 8 },
};

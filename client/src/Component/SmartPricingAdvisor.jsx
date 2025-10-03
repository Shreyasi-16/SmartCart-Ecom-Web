import React, { useMemo, useState } from "react";

const PRICER_URL = "http://localhost:5000/api/pricing/advise";

export default function SmartPricingAdvisor({ product }) {
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);

  const attrs = product?.attributes || {};
  const brand = attrs.brand || attrs.Brand || attrs.make || product?.brand || "";
  const model = attrs.model || attrs.Model || attrs.variant || product?.model || "";
  const yearRaw =
    attrs.year || attrs.Year || attrs.manufactureYear || product?.year || "";
  const condition =
    attrs.condition || attrs.Condition || product?.condition || "good";
  const city = product?.city || "";
  const state = product?.state || "";
  const priceRaw = product?.price;

  // Coerce numerics when possible
  const year =
    typeof yearRaw === "number"
      ? yearRaw
      : Number.isFinite(Number(yearRaw))
      ? Number(yearRaw)
      : undefined;

  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : Number.isFinite(Number(priceRaw))
      ? Number(priceRaw)
      : undefined;

  // Category ID (try numeric, fall back to string)
  const categoryIdRaw =
    product?.categoryId ?? product?.sub_category_id ?? product?.sub_category;
  const categoryId = Number.isFinite(Number(categoryIdRaw))
    ? Number(categoryIdRaw)
    : categoryIdRaw || undefined;

  const queryText = useMemo(
    () =>
      [brand, model, year, condition, city || state]
        .filter(Boolean)
        .join(" "),
    [brand, model, year, condition, city, state]
  );

  const getPrice = async () => {
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      // Build a clean payload (omit empty/undefined)
      const body = {
        brand: brand || undefined,
        model: model || undefined,
        year, // already undefined if invalid
        condition: condition || undefined,
        city: city || undefined,
        state: state || undefined,
        categoryId, // numeric if possible
        price, // numeric if possible
        // Optional helper text – server currently ignores it, but OK to send
        queryText: [
          product?.categoryName || product?.sub_category || "",
          brand && `brand:${brand}`,
          model && `model:${model}`,
          year && `year:${year}`,
          condition && `condition:${condition}`,
          city && `city:${city}`,
          state && `state:${state}`,
          product?.title,
        ]
          .filter(Boolean)
          .join(" | "),
        topK: 30,
      };

      const res = await fetch(PRICER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          `Non-JSON from server (${res.status}). First bytes: ${text.slice(
            0,
            120
          )}`
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Advisor failed");
      setOut(data);
    } catch (e) {
      setErr(e.message || "Could not get suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
      }}
    >
      <h3 style={{ margin: 0 }}>Smart Pricing Advisor</h3>
      <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
        Using similar listings near you to suggest a fair price.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 8,
          marginTop: 12,
        }}
      >
        <div>
          <strong>Brand</strong>: {brand || "—"}
        </div>
        <div>
          <strong>Model</strong>: {model || "—"}
        </div>
        <div>
          <strong>Year</strong>: {year ?? "—"}
        </div>
        <div>
          <strong>Condition</strong>: {condition || "—"}
        </div>
        <div>
          <strong>City</strong>: {city || state || "—"}
        </div>
        <div>
          <strong>Asking Price</strong>: {price != null ? `₹${price}` : "—"}
        </div>
      </div>

      <button onClick={getPrice} disabled={loading} style={{ marginTop: 12 }}>
        {loading ? "Analyzing…" : "Get Suggested Price"}
      </button>

      {err && (
        <div style={{ color: "#b91c1c", marginTop: 10 }}>Error: {err}</div>
      )}

      {out && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            Suggested: ₹{out.suggested?.toLocaleString?.() ?? "—"}
          </div>

          {out.range && (
            <div style={{ color: "#374151" }}>
              Typical range: ₹{out.range.low?.toLocaleString?.()} – ₹
              {out.range.high?.toLocaleString?.()}
            </div>
          )}

          {out.explanation && (
            <p style={{ marginTop: 8, color: "#374151" }}>
              {out.explanation}
            </p>
          )}

          {!!(out.comps?.length) && (
            <details style={{ marginTop: 6 }}>
              <summary>Top comparable listings</summary>
              <ul style={{ marginTop: 6 }}>
                {out.comps.slice(0, 5).map((c) => (
                  <li key={c._id}>
                    ₹{c.price?.toLocaleString?.() ?? "—"} — {c.title ?? "—"}{" "}
                    [{c.city ?? "—"}]{" "}
                    {typeof c._score === "number"
                      ? `(sim ${c._score.toFixed(3)})`
                      : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

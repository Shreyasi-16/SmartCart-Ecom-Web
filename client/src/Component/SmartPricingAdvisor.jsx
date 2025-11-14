import React, { useMemo, useState } from "react";
import "./SmartPricingAdvisor.css";
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
      const body = {
        brand: brand || undefined,
        model: model || undefined,
        year,
        condition: condition || undefined,
        city: city || undefined,
        state: state || undefined,
        categoryId,
        price,
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
        throw new Error(`Non-JSON from server (${res.status}).`);
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
    <div className="advisor-card">
      <h3 className="advisor-title">Smart Pricing Advisor</h3>
      <p className="advisor-subtitle">
        Using similar listings near you to suggest a fair price.
      </p>

      <div className="advisor-grid">
        <div><strong>Brand:</strong> {brand || "—"}</div>
        <div><strong>Model:</strong> {model || "—"}</div>
        <div><strong>Year:</strong> {year ?? "—"}</div>
        <div><strong>Condition:</strong> {condition || "—"}</div>
        <div><strong>City:</strong> {city || state || "—"}</div>
        <div><strong>Asking Price:</strong> {price != null ? `₹${price}` : "—"}</div>
      </div>

      <button
        className="advisor-btn"
        onClick={getPrice}
        disabled={loading}
      >
        {loading ? "Analyzing…" : "Get Suggested Price"}
      </button>

      {err && <div className="advisor-error">Error: {err}</div>}

      {out && (
        <div className="advisor-output">
          <div className="advisor-suggested">
            Suggested: ₹{out.suggested?.toLocaleString?.() ?? "—"}
          </div>

          {out.range && (
            <div className="advisor-range">
              Typical range: ₹{out.range.low?.toLocaleString?.()} – ₹
              {out.range.high?.toLocaleString?.()}
            </div>
          )}

          {out.explanation && (
            <p className="advisor-explanation">{out.explanation}</p>
          )}

          {/* {!!(out.comps?.length) && (
            <details className="advisor-comps">
              <summary>Top comparable listings</summary>
              <ul>
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
          )} */}
        </div>
      )}
    </div>
  );
}

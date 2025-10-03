// routes/pricing.js
require('dotenv').config();
const router = require("express").Router();
const { MongoClient } = require("mongodb");
const ss = require("simple-statistics");
const _ = require("lodash");
const dayjs = require("dayjs");

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME   = process.env.DB_NAME || "SmartCart";

let col; // products collection
let embedderPromise = null;

// ---------- Mongo connection ----------
(async () => {
  if (!MONGO_URI) {
    console.error("❌ MONGODB_URI not set");
    return;
  }
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  col = client.db(DB_NAME).collection("products");
  console.log("✅ pricing.js connected to Mongo");
  console.log("pricing DB:", DB_NAME);

})();

// ---------- Embedding ----------
async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2"); // 384-dim
    })();
  }
  return embedderPromise;
}

//TEST
console.log("[pricing] file loaded:", __filename);

// sanity probe – should NEVER 404 if router is mounted
router.get("/__alive", (req, res) => {
  console.log("[pricing] __alive hit");
  res.json({ ok: true, from: "pricing.js", file: __filename });
});


// ---------- Helpers ----------
function conditionFactor(cond) {
  const m = { "like new": 1.1, excellent: 1.08, good: 1.0, fair: 0.9, poor: 0.8 };
  return m[(cond || "").toLowerCase()] ?? 1.0;
}
function demandFactor(list) {
  const recent = list.filter(
    (x) => dayjs().diff(dayjs(x.createdAt || new Date()), "day") <= 60
  );
  if (recent.length < 5) return 1;
  const mr = ss.median(recent.map((x) => x.price));
  const ma = ss.median(list.map((x) => x.price));
  return _.clamp(mr / ma, 0.95, 1.08);
}
function weightedMedian(items) {
  const arr = items.map(x => ({ v: x.price, w: x._score || 1 })).sort((a,b)=>a.v-b.v);
  const total = arr.reduce((s,x)=>s + x.w, 0);
  let acc = 0;
  for (const x of arr) { acc += x.w; if (acc >= total/2) return x.v; }
  return arr.length ? arr[Math.floor(arr.length/2)].v : 0;
}
const norm = (s) => (s || "").toString().trim();

// --- sanity checks ---
router.get("/ping", (req, res) => {
  console.log("pricing.js loaded from:", __filename);
  res.json({ ok: true, from: "pricing.js" });
});

router.get("/debug/knn", async (req, res) => {
  try {
    if (!col) return res.status(500).json({ ok: false, error: "db_not_ready" });

    // optional query ?q=iphone 13
    let q = (req.query.q || "").trim();
    if (!q) {
      const seed = await col.findOne(
        { embedding: { $type: "array" } },
        { projection: { title: 1, description: 1 } }
      );
      if (!seed) return res.status(400).json({ ok: false, error: "no_docs_with_embedding" });
      q = seed.title || seed.description || "product";
    }

    const embedder = await getEmbedder();
    const out = await embedder(q, { pooling: "mean", normalize: true });
    const vec = Array.from(out.data || []);
    if (vec.length !== 384) return res.status(500).json({ ok: false, error: `bad_vector_len_${vec.length}` });

    const results = await col.aggregate([
      { $search: { index: "vector_index", knnBeta: { path: "embedding", vector: vec, k: 10 } } },
      { $project: { title: 1, price: 1, city: 1, _score: { $meta: "searchScore" } } },
      { $limit: 5 }
    ]).toArray();

    res.json({ ok: true, seed: q, count: results.length, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});


// ---------- Advisor ----------
router.post("/advise", async (req, res) => {
  try {
    if (!col) return res.status(500).json({ error: "db_not_ready" });

    const {
      brand, model, year, condition,
      city, state, categoryId,
      price, topK = 30
    } = req.body || {};

    // 1) Build tolerant category matcher (we’ll filter in JS, not in $search)
    let catValue;
    if (categoryId != null && categoryId !== "") {
      const catNum = Number(categoryId);
      catValue = !Number.isNaN(catNum) ? catNum : norm(categoryId);
    }

    // 2) Vector query text (fallback to something generic)
    const qTextParts = [brand, model, year, condition].filter(Boolean);
    const qText = qTextParts.length ? qTextParts.join(" ") : (brand || model || "product");

    // 3) Try vector search WITHOUT any $match in the $search stage
    //    (Some clusters/index configs choke if we mix filter with knnBeta.)
    let comps = [];
    let hitAttempt = "vector";
    try {
      const embedder = await getEmbedder();
      const q = await embedder(qText, { pooling: "mean", normalize: true });
      const qv = Array.from(q.data || []);
      if (!Array.isArray(qv) || qv.length !== 384) throw new Error(`bad embedding length ${qv.length}`);

      const fanoutK = Math.max(Number(topK) || 30, 30) * 12; // big fanout
      const pipeline = [
        { $search: { index: "vector_index", knnBeta: { path: "embedding", vector: qv, k: fanoutK } } },
        { $project: { title:1, price:1, city:1, state:1, condition:1, categoryId:1, createdAt:1, _score:{$meta:"searchScore"} } },
        { $sort: { _score: -1 } },
        { $limit: fanoutK } // pull them all, we’ll filter next
      ];
      const raw = await col.aggregate(pipeline, { allowDiskUse: true }).toArray();

      // JS-side light filtering (keep very tolerant)
      comps = raw.filter(r => {
        // category filter if provided
        const catOk = (catValue == null)
          || r.categoryId === catValue
          || (typeof r.categoryId === "string" && r.categoryId.toString() === String(catValue));

        // optional wide price band if price provided
        const priceOk = (typeof price !== "number" || Number.isNaN(price))
          ? true
          : (typeof r.price === "number" && r.price >= price * 0.4 && r.price <= price * 1.6);

        return catOk && priceOk;
      }).slice(0, Number(topK) || 30);
    } catch (e) {
      // If $search fails entirely, we’ll fall back.
      comps = [];
    }

    // 4) Fallback A: regex on brand/model/title inside category (very tolerant)
    if (!comps.length) {
      hitAttempt = "fallback:regex";
      const rx = new RegExp(
        [brand, model].filter(Boolean).join("|").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      const rxMatch = {
        ...(catValue != null ? { categoryId: catValue } : {}),
        $or: [
          { title: { $regex: rx } },
          { brand: { $regex: rx } },
          { model: { $regex: rx } },
          { description: { $regex: rx } }
        ]
      };
      comps = await col.find(rxMatch, {
        projection: { title:1, price:1, city:1, state:1, condition:1, categoryId:1, createdAt:1 }
      }).sort({ createdAt: -1 }).limit(Number(topK) || 30).toArray();
    }

    // 5) Fallback B: category only, latest
    if (!comps.length) {
      hitAttempt = "fallback:categoryOnly";
      const match = (catValue != null) ? { categoryId: catValue } : {};
      comps = await col.find(match, {
        projection: { title:1, price:1, city:1, state:1, condition:1, categoryId:1, createdAt:1 }
      }).sort({ createdAt: -1 }).limit(Number(topK) || 30).toArray();
    }

    // 6) Fallback C: absolutely anything, latest
    if (!comps.length) {
      hitAttempt = "fallback:any";
      comps = await col.find({}, {
        projection: { title:1, price:1, city:1, state:1, condition:1, categoryId:1, createdAt:1 }
      }).sort({ createdAt: -1 }).limit(Number(topK) || 30).toArray();
    }

    if (!comps.length) {
      return res.json({ suggested: null, explanation: "No similar listings found.", comps: [], hitAttempt });
    }

    // Pricing
    const baseline = weightedMedian(comps);
    const prices = comps.map(x => x.price).filter(n => typeof n === "number").sort((a,b)=>a-b);
    const p25 = prices.length ? ss.quantileSorted(prices, 0.25) : baseline;
    const p75 = prices.length ? ss.quantileSorted(prices, 0.75) : baseline;

    const nowYear = new Date().getFullYear();
    const age = Math.max(0, nowYear - (Number(year) || nowYear));
    const ageFactor  = _.clamp(1 - age * 0.03, 0.7, 1.05);
    const condFactor = conditionFactor(condition);
    const demFactor  = demandFactor(comps);

    const suggested = Math.round((baseline || 0) * ageFactor * condFactor * demFactor);

    return res.json({
      suggested,
      range: { low: Math.round(p25 || 0), high: Math.round(p75 || 0) },
      baseline,
      explanation: `Found ${comps.length} comps (match: ${hitAttempt}). Suggested ₹${(suggested || 0).toLocaleString()}.`,
      comps: comps.slice(0, 8),
      hitAttempt
    });
  } catch (e) {
    return res.status(500).json({ error: "advisor_failed", detail: String(e.message || e) });
  }
});

module.exports = router;

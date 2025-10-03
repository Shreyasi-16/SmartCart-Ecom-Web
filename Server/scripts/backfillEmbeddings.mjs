// scripts/backfillEmbeddings.mjs
// Run: node scripts/backfillEmbeddings.mjs
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { pipeline } from "@xenova/transformers";

dotenv.config();

function maskMongoUri(uri) {
  if (!uri) return uri;
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      const user = u.username ? encodeURIComponent(decodeURIComponent(u.username)) : "";
      const auth = user ? ${user}:********@ : "@";
      return ${u.protocol}//${auth}${u.host}${u.pathname}${u.search};
    }
    return uri;
  } catch {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:@");
  }
}

(async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.ATLAS_URI;
    const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB_NAME || "SmartCart";

    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI / MONGO_URI / ATLAS_URI not set");
      process.exit(1);
    }

    console.log("🔗 Connecting to:", maskMongoUri(MONGODB_URI));
    console.log("🗂  DB Name:", DB_NAME);

    const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 15000 });
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const col = db.collection("products");

    const total = await col.estimatedDocumentCount();
    const withEmb = await col.countDocuments({ embedding: { $exists: true, $type: "array" } });
    console.log(`📦 products total: ${total}`);
    console.log(`🧠 with embedding: ${withEmb}`);

    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedder ready");

    // Recompute for docs with missing OR wrong-size embeddings
    const cursor = col.find(
      {
        $or: [
          { embedding: { $exists: false } },
          { embedding: { $type: "array" }, $expr: { $ne: [{ $size: "$embedding" }, 384] } }
        ]
      },
      {
        projection: {
          _id: 1, title: 1, brand: 1, model: 1,
          description: 1, city: 1, state: 1
        },
        batchSize: 50
      }
    );

    let done = 0;
    const BATCH = 25;
    let batch = [];

    const makeText = (doc) =>
      [doc.title, doc.brand, doc.model, doc.description, doc.city, doc.state]
        .filter(Boolean)
        .join(" ")
        .trim();

    const embed = async (text) => {
      const out = await embedder(text, { pooling: "mean", normalize: true });
      return Array.from(out.data);
    };

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const text = makeText(doc);
      if (!text) continue;

      batch.push({ _id: doc._id, text });

      if (batch.length >= BATCH) {
        const ops = [];
        for (const item of batch) {
          try {
            const vec = await embed(item.text);
            ops.push({ updateOne: { filter: { _id: item._id }, update: { $set: { embedding: vec } } } });
          } catch (e) { console.error(`⚠ embed failed for ${item._id}:, e.message`); }
        }
        if (ops.length) {
          await col.bulkWrite(ops, { ordered: false });
          done += ops.length;
          console.log(`✅ Upserted embeddings for ${done}`);
        }
        batch = [];
      }
    }

    if (batch.length) {
      const ops = [];
      for (const item of batch) {
        try {
          const vec = await embed(item.text);
          ops.push({ updateOne: { filter: { _id: item._id }, update: { $set: { embedding: vec } } } });
        } catch (e) { console.error(`⚠ embed failed for ${item._id}:, e.message`); }
      }
      if (ops.length) {
        await col.bulkWrite(ops, { ordered: false });
        done += ops.length;
        console.log(`✅ Upserted embeddings for ${done}`);
      }
    }

    console.log("🎉 Backfill complete.");
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error("💥 Fatal error:", err.message);
    process.exit(1);
  }
})();
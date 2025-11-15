# python_service/recommender_service.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import joblib
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "SmartCart")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "final_hybrid_location_recommender.pkl")

app = Flask(__name__)
CORS(app)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]


def clean_doc(doc):
    """Convert ObjectIds to strings."""
    if isinstance(doc, list):
        return [clean_doc(x) for x in doc]
    elif isinstance(doc, dict):
        out = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                out[k] = str(v)
            elif isinstance(v, (dict, list)):
                out[k] = clean_doc(v)
            else:
                out[k] = v
        return out
    return doc


# -------------------------------------------------
# Load Model
# -------------------------------------------------
if os.path.exists(MODEL_PATH):
    model_payload = joblib.load(MODEL_PATH)
    print("✔ Model loaded")
else:
    model_payload = None
    print("❌ Model file NOT found")


@app.route("/recommend", methods=["GET", "POST"])
def recommend():
    global model_payload

    if not model_payload:
        return jsonify({"error": "Model not trained"}), 500

    user_id = request.args.get("user_id") or (request.json or {}).get("user_id")
    n = int(request.args.get("top_n", 28))

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    # Extract components
    knn = model_payload["knn"]
    product_ids = model_payload["product_ids"]
    product_vectors = model_payload["product_vectors"]
    user_events = model_payload["user_events"]
    user_location_map = model_payload["user_location_map"]

    # -------------------------------------------------
    # NEW USER → RANDOM PRODUCTS
    # -------------------------------------------------
    if user_id not in user_events or len(user_events[user_id]) == 0:
        print(f"[NEW USER] {user_id}")

        random_products = list(db.products.aggregate([{"$sample": {"size": n}}]))

        # Add nearby items
        if user_id in user_location_map:
            coords = user_location_map[user_id]
            nearby = list(
                db.products.find({
                    "location.coordinates": {
                        "$near": {
                            "$geometry": {"type": "Point", "coordinates": coords},
                            "$maxDistance": 50000
                        }
                    }
                }).limit(int(n * 0.4))
            )
            random_products.extend(nearby)

        final = []
        seen = set()
        for p in random_products:
            pid = str(p["_id"])
            if pid not in seen:
                seen.add(pid)
                p["_id"] = pid
                final.append(clean_doc(p))

        return jsonify({"recommendations": final[:n], "count": len(final[:n])})

    # -------------------------------------------------
    # EXISTING USER → CATEGORY BASED RECOMMENDATION
    # -------------------------------------------------
    print(f"[KNOWN USER] {user_id}")

    last_pid, _ = user_events[user_id][-1]

    if last_pid not in product_ids:
        # fallback random
        fallback = list(db.products.aggregate([{"$sample": {"size": n}}]))
        for p in fallback:
            p["_id"] = str(p["_id"])
        return jsonify({"recommendations": clean_doc(fallback), "count": len(fallback)})

    index = product_ids.index(last_pid)

    distances, indices = knn.kneighbors(
        [product_vectors[index]], n_neighbors=min(n + 20, len(product_ids))
    )

    recommended_ids = [product_ids[i] for i in indices.flatten()]

    recs = list(
        db.products.find({"_id": {"$in": [ObjectId(pid) for pid in recommended_ids]}})
    )

    # Location boost
    if user_id in user_location_map:
        coords = user_location_map[user_id]
        near = list(
            db.products.find({
                "location.coordinates": {
                    "$near": {
                        "$geometry": {"type": "Point", "coordinates": coords},
                        "$maxDistance": 50000
                    }
                }
            }).limit(int(n * 0.4))
        )
        recs.extend(near)

    # Deduplicate
    seen = set()
    final_recs = []
    for p in recs:
        pid = str(p["_id"])
        if pid not in seen:
            seen.add(pid)
            p["_id"] = pid
            final_recs.append(clean_doc(p))

    return jsonify({"recommendations": final_recs[:n], "count": len(final_recs[:n])})


@app.route("/reload", methods=["POST"])
def reload_model():
    """Reload the model after retraining."""
    global model_payload

    if os.path.exists(MODEL_PATH):
        model_payload = joblib.load(MODEL_PATH)
        print("✔ Model reloaded")
        return jsonify({"status": "ok"})

    return jsonify({"error": "Model file missing"}), 404


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)

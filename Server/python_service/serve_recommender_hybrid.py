from flask import Flask, request, jsonify
import joblib
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from flask_cors import CORS
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "SmartCart")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "final_hybrid_location_recommender.pkl")

app = Flask(__name__)
CORS(app)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Utility: recursively convert ObjectIds → strings
def clean_doc(doc):
    if isinstance(doc, list):
        return [clean_doc(x) for x in doc]
    elif isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, (dict, list)):
                new_doc[k] = clean_doc(v)
            else:
                new_doc[k] = v
        return new_doc
    else:
        return doc


# Load model on start
if os.path.exists(MODEL_PATH):
    model_payload = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully")
else:
    model_payload = None
    print(f"⚠️ Model not found at {MODEL_PATH}")


@app.route("/recommend", methods=["POST", "GET"])
def recommend():
    if not model_payload:
        return jsonify({"error": "Model not trained"}), 500

    user_id = request.args.get("user_id")
    n = int(request.args.get("n", 28))
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    knn = model_payload["knn"]
    product_ids = model_payload["product_ids"]
    product_vectors = model_payload["product_vectors"]
    user_product_map = model_payload["user_product_map"]
    user_location_map = model_payload["user_location_map"]

    recs = []

    # --- 🧠 Handle NEW USER (no events yet) ---
    if user_id not in user_product_map or not user_product_map[user_id]:
        print("⚠️ New user — showing random or nearby products.")
        random_products = list(db.products.aggregate([{ "$sample": { "size": n } }]))
        
        # Try nearby products if user's location exists
        if user_id in user_location_map:
            user_coords = user_location_map[user_id]
            nearby = list(
                db.products.find(
                    {
                        "location.coordinates": {
                            "$near": {
                                "$geometry": {"type": "Point", "coordinates": user_coords},
                                "$maxDistance": 50000,
                            }
                        }
                    }
                ).limit(int(n * 0.4))
            )
            random_products.extend(nearby)
        
        # Clean ObjectIds
        for p in random_products:
            p["_id"] = str(p["_id"])
        return jsonify({"recommendations": clean_doc(random_products), "count": len(random_products)})

    # --- Behavioral recommendations ---
    if user_id in user_product_map and user_product_map[user_id]:
        recent_pid, _ = user_product_map[user_id][-1]
        if recent_pid in product_ids:
            idx = product_ids.index(recent_pid)
            distances, indices = knn.kneighbors([product_vectors[idx]], n_neighbors=n + 1)
            similar_ids = [product_ids[i] for i in indices.flatten()[1:]]
            recs = list(db.products.find({"_id": {"$in": [ObjectId(pid) for pid in similar_ids]}}))
    else:
        recs = list(db.products.find().limit(n))

    # --- Location-based boost (for known users) ---
    if user_id in user_location_map:
        user_coords = user_location_map[user_id]
        near = list(
            db.products.find(
                {
                    "location.coordinates": {
                        "$near": {
                            "$geometry": {"type": "Point", "coordinates": user_coords},
                            "$maxDistance": 50000,
                        }
                    }
                }
            ).limit(int(n * 0.4))
        )
        recs.extend(near)

    # --- Remove duplicates & clean ObjectIds ---
    seen = set()
    unique_recs = []
    for p in recs:
        pid = str(p["_id"])
        if pid not in seen:
            seen.add(pid)
            p["_id"] = pid
            unique_recs.append(clean_doc(p))  # Clean nested ObjectIds

    return jsonify({"recommendations": unique_recs[:n], "count": len(unique_recs)})


@app.route("/reload", methods=["POST", "GET"])
def reload_model():
    """Reload the model after retraining."""
    global model_payload
    if os.path.exists(MODEL_PATH):
        model_payload = joblib.load(MODEL_PATH)
        print("🔄 Model reloaded successfully")
        return jsonify({"status": "reloaded"})
    else:
        return jsonify({"error": "Model file not found"}), 404


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)

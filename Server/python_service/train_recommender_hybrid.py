import os
import joblib
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.neighbors import NearestNeighbors
import numpy as np

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "SmartCart")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "final_hybrid_location_recommender.pkl")

# -------------------------------
# Event weights (base values)
# -------------------------------
EVENT_WEIGHTS = {
    "view": 1,
    "search": 2,
    "wishlist": 4,
    "cart": 6,
    "purchase": 10
}

# Split ratio
BEHAVIOR_RATIO = 0.6
LOCATION_RATIO = 0.4


def connect_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
    db = client[DB_NAME]
    print(f"✅ Connected to MongoDB — {db.name}")
    return db


def train_and_save():
    db = connect_db()

    user_product_map = {}
    user_location_map = {}
    product_category_map = {}

    print("🔹 Loading products and categories...")
    for p in db.products.find({}, {"_id": 1, "categoryId": 1}):
        pid = str(p["_id"])
        product_category_map[pid] = p.get("categoryId")

    print(f"📦 Loaded {len(product_category_map)} products")

    print("🔹 Loading events and building user maps...")
    count = 0
    for e in db.events.find({}, {"userId": 1, "productId": 1, "eventType": 1, "location": 1}):
        count += 1
        if count % 1000 == 0:
            print(f"Processed {count} events")

        uid = str(e["userId"])
        pid = str(e["productId"])
        event_type = e.get("eventType", "view")

        base_weight = EVENT_WEIGHTS.get(event_type, 1)
        # Behavioral weight (60%)
        behavior_weight = base_weight * BEHAVIOR_RATIO

        # Location/Purchase boost (40%)
        if event_type in ["purchase"]:
            final_weight = base_weight * (BEHAVIOR_RATIO + LOCATION_RATIO)
        else:
            final_weight = behavior_weight

        user_product_map.setdefault(uid, []).append((pid, final_weight))

        # Save last known location
        loc = e.get("location", {})
        coords = loc.get("coordinates") if isinstance(loc, dict) else None
        if coords and len(coords) == 2:
            user_location_map[uid] = coords

    print(f"🧩 Built maps — Users: {len(user_product_map)}, Products: {len(product_category_map)}")

    # --- Build category vectors ---
    unique_cats = list(set(filter(None, product_category_map.values())))
    cat_index = {c: i for i, c in enumerate(unique_cats)}
    product_vectors = np.zeros((len(product_category_map), len(unique_cats)))
    product_ids = list(product_category_map.keys())

    for i, pid in enumerate(product_ids):
        cat = product_category_map.get(pid)
        if cat in cat_index:
            product_vectors[i, cat_index[cat]] = 1

    # --- Train NearestNeighbors ---
    knn = NearestNeighbors(metric="cosine", algorithm="brute")
    knn.fit(product_vectors)

    # --- Save model payload ---
    payload = {
        "knn": knn,
        "product_ids": product_ids,
        "product_vectors": product_vectors,
        "product_category_map": product_category_map,
        "user_product_map": user_product_map,
        "user_location_map": user_location_map,
        "meta": {
            "trained_at": datetime.utcnow().isoformat(),
            "n_users": len(user_product_map),
            "n_products": len(product_category_map),
            "n_categories": len(unique_cats),
            "weights": {"behavior": BEHAVIOR_RATIO, "location_purchase": LOCATION_RATIO}
        },
    }

    joblib.dump(payload, MODEL_PATH)
    print(f"✅ Model saved → {MODEL_PATH}")
    print("📘 Meta:", payload["meta"])


if __name__ == "__main__":
    print("🚀 Starting hybrid training...")
    train_and_save()

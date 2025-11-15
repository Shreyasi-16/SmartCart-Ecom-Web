# python_service/train_hybrid_recommender.py
# Clean version: No emojis, no Unicode characters, safe for Windows CMD

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

# ----------------------------------------------------
# EVENT WEIGHTS
# ----------------------------------------------------
EVENT_WEIGHTS = {
    "view": 1,
    "search": 2,
    "wishlist": 4,
    "cart": 6,
    "purchase": 10,
}

BEHAVIOR_RATIO = 0.6
LOCATION_RATIO = 0.4  # Additional weight for purchases


def connect_db():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    print("Connected to MongoDB database:", DB_NAME)
    return db


def train_and_save():
    print("Starting category-based recommender training...")

    db = connect_db()

    user_events = {}
    user_location_map = {}
    product_category_map = {}

    print("Loading products...")
    products = list(db.products.find({}, {"_id": 1, "categoryId": 1}))

    for p in products:
        pid = str(p["_id"])
        product_category_map[pid] = p.get("categoryId")

    print("Loaded", len(product_category_map), "products")

    # ----------------------------------------------------
    # Load events
    # ----------------------------------------------------
    print("Loading events...")
    event_count = 0

    events_cursor = db.events.find(
        {},
        {"userId": 1, "productId": 1, "eventType": 1, "location": 1},
    )

    for e in events_cursor:
        event_count += 1

        if event_count % 500 == 0:
            print("Processed", event_count, "events")

        uid = str(e.get("userId"))
        pid = str(e.get("productId"))

        if not pid or pid not in product_category_map:
            continue

        event_type = e.get("eventType", "view")
        base_weight = EVENT_WEIGHTS.get(event_type, 1)

        # Behavior part (60%)
        weight = base_weight * BEHAVIOR_RATIO

        if event_type == "purchase":
            # Extra 40% boost
            weight = base_weight * (BEHAVIOR_RATIO + LOCATION_RATIO)

        # Save event
        user_events.setdefault(uid, []).append((pid, weight))

        # Save last known location
        loc = e.get("location") or {}
        coords = loc.get("coordinates")
        if coords and len(coords) == 2:
            user_location_map[uid] = coords

    print("Built user behavior map for", len(user_events), "users")

    # ----------------------------------------------------
    # Build category one-hot vectors
    # ----------------------------------------------------
    print("Building category vectors...")

    categories = list(set(product_category_map.values()))
    categories = [c for c in categories if c is not None]

    print("Unique categories:", len(categories))

    cat_index = {cat: i for i, cat in enumerate(categories)}

    product_vectors = []
    product_ids = []

    for pid, cat in product_category_map.items():
        if cat not in cat_index:
            continue

        vec = np.zeros(len(categories))
        vec[cat_index[cat]] = 1

        product_vectors.append(vec)
        product_ids.append(pid)

    product_vectors = np.vstack(product_vectors)

    print("Built vectors for", len(product_ids), "products")

    # ----------------------------------------------------
    # Train NearestNeighbors
    # ----------------------------------------------------
    print("Training KNN model...")
    knn = NearestNeighbors(metric="cosine", algorithm="brute")
    knn.fit(product_vectors)

    print("KNN model training completed")

    # ----------------------------------------------------
    # Save model
    # ----------------------------------------------------
    payload = {
        "knn": knn,
        "product_ids": product_ids,
        "product_vectors": product_vectors,
        "product_category_map": product_category_map,
        "user_events": user_events,
        "user_location_map": user_location_map,
        "meta": {
            "trained_at": datetime.utcnow().isoformat(),
            "n_products": len(product_ids),
            "n_categories": len(categories),
            "n_users": len(user_events),
        },
    }

    joblib.dump(payload, MODEL_PATH)

    print("Model saved at:", MODEL_PATH)
    print("Training complete.")


if __name__ == "__main__":
    print("Running hybrid (event + category) recommender training...")
    train_and_save()

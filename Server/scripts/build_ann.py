import hnswlib
import numpy as np
import json
from pymongo import MongoClient
from tqdm import tqdm  # progress bar

print("Connecting to MongoDB...")
client = MongoClient("mongodb+srv://SmartCart:SmartCart07@cluster0.3opek4y.mongodb.net/SmartCart")
db = client["SmartCart"]
products = db["products"]

embeddings = []
product_ids = []

print(" Loading embeddings from MongoDB...")
all_products = list(products.find({"photos.embedding": {"$exists": True, "$ne": []}}))
for product in tqdm(all_products, desc="Products"):
    for photo in product["photos"]:
        if "embedding" in photo:
            embeddings.append(photo["embedding"])
            product_ids.append(str(product["_id"]))

embeddings = np.array(embeddings, dtype=np.float32)
dim = embeddings.shape[1]

print(f"Loaded {len(embeddings)} embeddings, building ANN index...")

index = hnswlib.Index(space='cosine', dim=dim)
index.init_index(max_elements=len(embeddings), ef_construction=200, M=16)

# Add embeddings with progress
for i in tqdm(range(len(embeddings)), desc="Adding embeddings"):
    index.add_items(embeddings[i:i+1], np.array([i]))

index.set_ef(50)

# Save index and product IDs
index.save_index("scripts/ann_index.bin")
with open("scripts/product_ids.json", "w") as f:
    json.dump(product_ids, f)

print("ANN index and product IDs saved successfully!")

import hnswlib
import numpy as np
import json
import sys
import os

# -------------------------------
# File paths
# -------------------------------
INDEX_PATH = "scripts/ann_index.bin"
IDS_PATH = "scripts/product_ids.json"

# -------------------------------
# Read embedding from stdin
# -------------------------------
try:
    input_data = sys.stdin.read()
    query_embedding = np.array(json.loads(input_data), dtype=np.float32)
except Exception as e:
    print(json.dumps([]))  # Return empty results if input is invalid
    print(f"[stderr] Error reading input: {e}", file=sys.stderr)
    sys.exit(0)

# -------------------------------
# Check if files exist
# -------------------------------
if not os.path.exists(INDEX_PATH):
    print(json.dumps([]))
    print(f"[stderr] ANN index file not found at {INDEX_PATH}!", file=sys.stderr)
    sys.exit(0)

if not os.path.exists(IDS_PATH):
    print(json.dumps([]))
    print(f"[stderr] Product IDs file not found at {IDS_PATH}!", file=sys.stderr)
    sys.exit(0)

# -------------------------------
# Load index and perform search
# -------------------------------
try:
    print(f"[stderr] Loading ANN index from {INDEX_PATH}...", file=sys.stderr)
    dim = 512  # embedding dimension
    index = hnswlib.Index(space='cosine', dim=dim)
    index.load_index(INDEX_PATH)
    index.set_ef(50)  # adjust for speed vs accuracy
    print(f"[stderr] ANN index loaded successfully.", file=sys.stderr)

    # Load product IDs
    with open(IDS_PATH, "r") as f:
        product_ids = json.load(f)

    # Perform ANN search
    k = 10  # top k results
    print(f"[stderr] Performing ANN search (top {k})...", file=sys.stderr)
    labels, distances = index.knn_query(query_embedding, k=k)
    print(f"[stderr] ANN search completed.", file=sys.stderr)

    # Format results
    results = [
        {"productId": str(product_ids[int(i)]), "distance": float(d)}
        for i, d in zip(labels[0], distances[0])
    ]

    # Output JSON only
    print(json.dumps(results))

except Exception as e:
    print(json.dumps([]))
    print(f"[stderr] ANN search failed: {e}", file=sys.stderr)
    sys.exit(0)

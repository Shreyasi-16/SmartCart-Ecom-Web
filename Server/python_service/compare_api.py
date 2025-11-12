from fastapi import APIRouter, HTTPException
from pymongo import MongoClient
from bson import ObjectId
from sentence_transformers import SentenceTransformer, util
import torch
import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
compare_router = APIRouter()

# ---------------- MongoDB Connection ----------------
client = MongoClient("mongodb+srv://SmartCart:SmartCart07@cluster0.3opek4y.mongodb.net/")
db = client["SmartCart"]
collection = db["products"]

def extract_features(desc: str, category_id: int = None, attributes: dict = None, title: str = ""):
    if not desc or not isinstance(desc, str):
        return {}

    features = {}
    desc_lower = desc.lower()
    title_lower = title.lower()
    desc_lower = desc.lower()
    text_lower = title_lower + " " + desc_lower  # combine title + description
    text_to_check = f"{title.lower()} {desc_lower}"
    # -------------------- VEHICLES (Cars / Bikes) --------------------
    if category_id in [1, 3]:
        if attributes:
            # Brand / Model / Fuel / Year / KM driven
            if "Brand" in attributes and attributes["Brand"]:
                features["Brand"] = str(attributes["Brand"])  # preserve capitalization
            if "Model" in attributes and attributes["Model"]:
                features["Model"] = str(attributes["Model"])
            if "Fuel" in attributes and attributes["Fuel"]:
                features["Fuel Type"] = str(attributes["Fuel"])
            if "Year" in attributes and attributes["Year"]:
                features["Year"] = str(attributes["Year"])
            if "KM driven" in attributes and attributes["KM driven"]:
                features["Driven Distance"] = str(attributes["KM driven"]) + " km"

        if re.search(r"well\s*maintained", text_to_check):
            features["Condition"] = "Well Maintained"
        elif re.search(r"excellent|best\s*condition|excillent|good\s*condition", text_to_check):
            features["Condition"] = "Excellent"
        elif re.search(r"brand\s*new|sealed\s*pack|unused", text_to_check):
            features["Condition"] = "New"
        elif re.search(r"used|old|second\s*hand", text_to_check):
            features["Condition"] = "Used"

        # Optional: engine capacity from description
        if match := re.search(r"(\d+)\s*cc", desc_lower):
            features["Engine Capacity"] = match.group(1) + " cc"

        # Filter out empty/null values
        features = {k: v for k, v in features.items() if v and v not in ["-", "none", "null", "n/a"]}
        return dict(list(features.items())[:6])

    # -------------------- ELECTRONICS --------------------
    elif category_id in [201, 202, 401, 402, 403, 404, 405]:
        # Common extractions for phones, tablets, laptops, TVs, cameras, fridges, washing machines
        if "smart tv" in text_lower:
            features["Smart TV"] = "Yes"
        if "wifi only" in text_lower:
            features["WiFi Only"] = "Yes"
        if "led" in text_lower:
            features["Screen Type"] = "LED"
        if "oled" in text_lower:
            features["Screen Type"] = "OLED"
        if "4k" in text_lower:
            features["Resolution"] = "4K"
        elif "1080p" in text_lower or "full hd" in text_lower:
            features["Resolution"] = "Full HD"
        if "5g" in text_lower:
            features["5G Support"] = "Yes"
        if "dual sim" in text_lower:
            features["Dual SIM"] = "Yes"
        # ---------------- COLOR Extraction ----------------
        if match := re.search(r"\b(black|white|blue|red|green|gold|silver|gray|grey|pink|yellow)\b", text_lower):
            features["Color"] = match.group(1).capitalize()

        # ---------------- RAM + STORAGE Extraction (improved) ----------------
        STORAGE_SIZES = {64, 128, 256, 512, 1024, 2048}
        RAM_SIZES = {2, 3, 4, 6, 8, 12, 16, 32}

        # Match both "8GB RAM" and "RAM 8GB", "512GB SSD" etc.
        for m in re.finditer(r"\b(?:ram\s*)?(\d+(?:\.\d+)?)\s*(?:gb|tb)\b|\b(\d+(?:\.\d+)?)\s*(?:gb|tb)\s*ram\b", text_lower):
            num = float(m.group(1) or m.group(2))
            full_match = m.group(0)

            if "tb" in full_match:
                # Convert TB to GB
                gb_value = round(num * 1024)
                features["Storage"] = f"{gb_value} GB"
            elif "ram" in full_match:
                features["RAM"] = f"{int(num)} GB"
            else:
                # Assume storage if not explicitly RAM
                if int(num) in STORAGE_SIZES:
                    features["Storage"] = f"{int(num)} GB"


            # Standalone numeric matches
            if int(num) in STORAGE_SIZES and "Storage" not in features:
                features["Storage"] = f"{int(num)} GB"
            elif int(num) in RAM_SIZES and "RAM" not in features:
                features["RAM"] = f"{int(num)} GB"


       # Brand extraction from title if present
        if match := re.search(
            r"(i\s*phone|dell|i\s*pad|apple|acer|samsung|hp|lenovo|mi|redmi|one\s*plus|oppo|reno|vivo|realme|honor|huawei|nokia|motorola|google|canon|nikon|lg|whirlpool|bosch|sony)",
            text_lower, re.I):   # re.I makes it case-insensitive
            features["Brand"] = match.group(1).replace(" ", "").title()

        # Condition
        if re.search(r"brand new|sealed pack|unused|new", text_lower):
            features["Condition"] = "New"
        elif re.search(r"used|old|good condition|second hand", text_lower):
            features["Condition"] = "Used"
        elif re.search(r"excellent condition|best condition", text_lower):
            features["Condition"] = "Excellent"

        # Warranty
        if match := re.search(r"(\d+)\s*year[s]?\s*warranty", desc_lower):
            features["Warranty"] = match.group(1) + " years"

        features = {k: v for k, v in features.items() if v and v not in ["-", "none", "null", "n/a"]}
        return dict(list(features.items())[:6])

    # -------------------- FASHION / CLOTHING --------------------
        # -------------------- FASHION / CLOTHING --------------------
    elif category_id in [601, 602, 603, 604]:
        # Extract features directly from attributes
        if attributes:
            for key, value in attributes.items():
                if value not in [None, "", "-", "null", "n/a"]:
                    features[key.title()] = str(value).title()

        # Detect condition if mentioned in text
        if re.search(r"brand new|unused|sealed pack|best", text_lower):
            features["Condition"] = "New"
        elif re.search(r"used|old|good condition|second hand", text_lower):
            features["Condition"] = "Used"

        # Clean empty values
        features = {k: v for k, v in features.items() if v and v not in ["-", "none", "null", "n/a"]}
        return dict(list(features.items())[:6])
    
     # 701–703 → take everything from attributes (including condition)
    elif category_id in [701, 702, 703]:
        if attributes:
            for key, value in attributes.items():
                if value not in [None, "", "-", "null", "n/a"]:
                    features[key.title()] = str(value).title()

        features = {
            k: v for k, v in features.items()
            if v and v not in ["-", "none", "null", "n/a"]
        }

        return dict(list(features.items())[:6])
    
    # -------------------- Furniture,PETS --------------------
    elif category_id in [5,8]:
        # Extract from attributes
        if attributes:
            for key, value in attributes.items():
                if value not in [None, "", "-", "null"]:
                    features[key.title()] = str(value).title()

        # Detect condition
        if re.search(r"brand\s*new|unused|sealed|good quality", desc_lower):
            features["Condition"] = "New"
        elif re.search(r"well\s*maintained|good\s*condition|used|old", desc_lower):
            features["Condition"] = "Used"

        # Clean up empty values
        features = {k: v for k, v in features.items() if v and v not in ["-", "none", "null", "n/a"]}
        return dict(list(features.items())[:6])

    # -------------------- OTHER / FALLBACK --------------------
    else:
        # Generic pattern extraction if category unknown
        if match := re.search(r"(black|white|blue|red|green|gold|silver|gray|grey|pink|yellow)", desc_lower):
            features["Color"] = match.group(1).title()
        if match := re.search(r"(\d+)\s*year[s]?\s*warranty", desc_lower):
            features["Warranty"] = match.group(1) + " years"
        features = {k: v for k, v in features.items() if v and v not in ["-", "none", "null", "n/a"]}
        return dict(list(features.items())[:6])

@compare_router.get("/compare/{product_id}")
def compare_product(product_id: str, top_n: int = 4):
    # 1️⃣ Fetch current product
    product = collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if "embedding" not in product:
        raise HTTPException(status_code=400, detail="Embedding missing for this product")
    
    # 2️⃣ Fetch candidate products in the same category AND city
    candidates = list(collection.find({
        "_id": {"$ne": ObjectId(product_id)},
        "categoryId": product["categoryId"],
        "city": product["city"],             # ✅ enforce same city
        "price": {"$gte": product["price"]*0.7, "$lte": product["price"]*1.3}
    }))
    
    if not candidates:
        return {"features": [], "products": []}
    
    # 3️⃣ Collect embeddings from DB (precomputed)
    candidate_embeddings = np.array([c["embedding"] for c in candidates])
    query_embedding = np.array(product["embedding"]).reshape(1, -1)
    
    # 4️⃣ Compute cosine similarity
    similarities = cosine_similarity(query_embedding, candidate_embeddings)[0]
    
    # 5️⃣ Select top-N similar products
    top_indices = np.argsort(similarities)[::-1][:top_n]
    similar_products = [candidates[i] for i in top_indices]
    
    # 6️⃣ Build comparison table data
    all_products = [product] + similar_products
    extracted_data = []
    for p in all_products:
        features = extract_features(
            p.get("description", ""),
            category_id=p.get("categoryId"),
            attributes=p.get("attributes"),
            title=p.get("title", "")
        )
        features["City"] = p.get("city", "N/A")
        main_photo = p.get("photos")[0]["url"] if p.get("photos") else "/defaultBG.jpg"
        extracted_data.append({
            "title": p.get("title", "Unknown"),
            "features": features,
            "photo": main_photo,
            "price": p.get("price", "-")
        })
    
    # 7️⃣ Collect all feature keys
    all_features = sorted(set().union(*(p["features"].keys() for p in extracted_data)))
    
    # 8️⃣ Final output
    final_output = {
        "features": all_features,
        "products": [
            {
                "_id": str(all_products[i]["_id"]),
                "title": p["title"],
                "photo": p["photo"],
                "price": p["price"],
                "values": [p["features"].get(f, "-") for f in all_features]
            }
            for i, p in enumerate(extracted_data)
        ]
    }
    
    return final_output



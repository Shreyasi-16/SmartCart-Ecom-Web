from fastapi import APIRouter, HTTPException
from pymongo import MongoClient
from bson import ObjectId
from sentence_transformers import SentenceTransformer, util
import torch
import re
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
        if "smart tv" in desc_lower:
            features["Smart TV"] = "Yes"
        if "wifi only" in desc_lower:
            features["WiFi Only"] = "Yes"
        if "led" in desc_lower:
            features["Screen Type"] = "LED"
        if "oled" in desc_lower:
            features["Screen Type"] = "OLED"
        if "4k" in desc_lower:
            features["Resolution"] = "4K"
        elif "1080p" in desc_lower or "full hd" in desc_lower:
            features["Resolution"] = "Full HD"
        if "5g" in desc_lower:
            features["5G Support"] = "Yes"
        if "dual sim" in desc_lower:
            features["Dual SIM"] = "Yes"
        # Storage / RAM / Battery Health extraction from title/description
        # Storage: matches '128 GB', '128gb', '128 storage'
        if match := re.search(r"(\d+)\s*(gb|storage)", text_lower):
            features["Storage"] = match.group(1) + " GB"

        # Battery Health: matches 'battery health 88%' or '88 Health'
        if match := re.search(r"(?:battery\s*health[:\s]*|)(\d{1,3})\s*%?\s*health", text_lower):
            features["Battery Health"] = match.group(1) + "%"



        # Universal numeric patterns
        patterns = {
            "RAM": [r"(\d+)\s*gb\s*ram"],
            "Battery": [r"(\d+)\s*mah"],
            "Display Size": [r"(\d+\.?\d*)\s*(inch|inches)"],
            "Capacity": [r"(\d+)\s*(ltrs|litres|l)"],
        }

        for feature, pats in patterns.items():
            for p in pats:
                if match := re.search(p, desc_lower, re.I):
                    features[feature] = match.group(1)
                    break

       # Brand extraction from title if present
        if match := re.search(
            r"(i\s*phone|samsung|lenovo|mi|redmi|oneplus|oppo|vivo|realme|honor|huawei|nokia|motorola|google|canon|nikon|lg|whirlpool|bosch|sony)",
            text_lower, re.I):   # re.I makes it case-insensitive
            features["Brand"] = match.group(1).replace(" ", "").title()


        # Condition
        if re.search(r"brand new|sealed pack|unused", desc_lower):
            features["Condition"] = "New"
        elif re.search(r"used|old|good condition|second hand", desc_lower):
            features["Condition"] = "Used"
        elif re.search(r"excellent condition|best condition", desc_lower):
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

# ---------------- Load embedding model ----------------
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')


# ---------------- Compare Endpoint ----------------
@compare_router.get("/compare/{product_id}")

def compare_product(product_id: str):
    product = collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    category_id = product.get("categoryId")
    if not category_id:
        raise HTTPException(status_code=400, detail="Product missing categoryId")

    all_same_category = list(collection.find(
        {"categoryId": category_id, "_id": {"$ne": ObjectId(product_id)}}
    ))

    if not all_same_category:
        raise HTTPException(status_code=404, detail="No similar products found")

    target_desc = product.get("description", "")
    target_emb = embedding_model.encode(target_desc, convert_to_tensor=True)
    all_descs = [p.get("description", "") for p in all_same_category]
    all_embs = embedding_model.encode(all_descs, convert_to_tensor=True)
    cos_scores = util.cos_sim(target_emb, all_embs)[0]
    top_idx = torch.topk(cos_scores, k=min(3, len(all_same_category))).indices.tolist()
    similar_products = [all_same_category[i] for i in top_idx]

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
        # Get main photo URL if available
        main_photo = None
        if p.get("photos") and len(p["photos"]) > 0:
            main_photo = p["photos"][0].get("url")  # adjust if your DB uses a different structure

        extracted_data.append({
            "title": p.get("title", "Unknown"),
            "features": features,
            "photo": main_photo or "/defaultBG.jpg",  # fallback default image
            "price": p.get("price", "-")  # fetch price from DB, fallback "-"
        })

    # Collect all feature keys
    all_features = sorted(set().union(*(p["features"].keys() for p in extracted_data)))

    # Prepare final output
    # Prepare final output
    final_output = {
        "features": all_features,
        "products": [
            {
                "_id": str(all_products[i]["_id"]),  # ✅ include product id
                "title": p["title"],
                "photo": p["photo"],  # include photo
                "price": p["price"],  # include price
                "values": [p["features"].get(f, "-") for f in all_features]
            }
            for i, p in enumerate(extracted_data)
        ]
    }


    return final_output



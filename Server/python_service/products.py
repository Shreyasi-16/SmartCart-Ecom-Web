from fastapi import FastAPI, APIRouter, HTTPException
from bson import ObjectId
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware
import re

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

# ---------------- MongoDB Connection ----------------
client = MongoClient("mongodb+srv://SmartCart:SmartCart07@cluster0.3opek4y.mongodb.net/SmartCart?retryWrites=true&w=majority")
db = client["SmartCart"]
products_collection = db["products"]

# ---------------- Helper: Convert ObjectIds ----------------
def convert_objectid(data):
    if isinstance(data, list):
        return [convert_objectid(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_objectid(value) for key, value in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data


# ---------------- Route: Get Similar Products ----------------
@router.get("/products/similar/{product_id}")
def get_similar_products(product_id: str):
    try:
        oid = ObjectId(product_id)
        product = products_collection.find_one({"_id": oid})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        attributes = product.get("attributes", {})
        price = product.get("price")
        city = product.get("city")
        state = product.get("state")
        category_id = product.get("categoryId")
        title = product.get("title", "")
        description = product.get("description", "")

        if not price:
            return {"count": 0, "data": [], "message": "Missing price"}

        # Define price range ±30%
        price_min = price * 0.7
        price_max = price * 1.3

        # Build regex keywords from title + description
        title_words = [re.escape(w) for w in title.split() if len(w) > 3]
        desc_words = [re.escape(w) for w in description.split() if len(w) > 3]
        keywords = list(set(title_words + desc_words))

        regex_conditions = []
        for word in keywords[:8]:  # limit to first 8 meaningful words
            regex_conditions.append({
                "$or": [
                    {"title": {"$regex": word, "$options": "i"}},
                    {"description": {"$regex": word, "$options": "i"}},
                ]
            })

        # Attribute match expressions
        attribute_matches = []
        for key, value in attributes.items():
            if value and isinstance(value, str):
                attribute_matches.append({"$eq": [f"$attributes.{key}", value]})

        # ---------------- PRIMARY PIPELINE ----------------
        pipeline = [
            {
                "$match": {
                    "_id": {"$ne": oid},
                    "price": {"$gte": price_min, "$lte": price_max},
                    "city": city,
                    "state": state,
                    "categoryId": category_id,
                }
            },
            {
                "$addFields": {
                    "matchCount": {
                        "$size": {
                            "$filter": {
                                "input": attribute_matches,
                                "as": "expr",
                                "cond": {"$eq": ["$$expr", True]},
                            }
                        }
                    },
                    # ✅ Compute how close the price is to selected product
                    "priceDifference": {"$abs": {"$subtract": ["$price", price]}},
                }
            },
            {
                "$match": {
                    "$or": regex_conditions,
                    "matchCount": {"$gte": 2},
                }
            },
            {
                # ✅ Sort by most matching attributes first, then closest price
                "$sort": {"matchCount": -1, "priceDifference": 1}
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "photos": 1,
                    "price": 1,
                    "priceDifference": 1,
                    "city": 1,
                    "state": 1,
                    "categoryId": 1,
                    "attributes": 1,
                    "matchCount": 1,
                }
            },
            {"$limit": 20},
        ]


        similar_products = list(products_collection.aggregate(pipeline))

        # ---------------- FALLBACK ----------------
        if not similar_products:
            # ---------------- FALLBACK ----------------
            fallback_pipeline = [
            {
                "$match": {
                    "_id": {"$ne": oid},
                    "categoryId": category_id,
                    "price": {"$gte": price_min, "$lte": price_max},
                }
            },
            {
                "$addFields": {
                    "matchCount": {
                        "$size": {
                            "$filter": {
                                "input": attribute_matches,
                                "as": "expr",
                                "cond": {"$eq": ["$$expr", True]},
                            }
                        }
                    },
                    "priceDifference": {"$abs": {"$subtract": ["$price", price]}},
                }
            },
            {
                "$match": {"matchCount": {"$gte": 1}}
            },
            {
                "$sort": {"matchCount": -1, "priceDifference": 1}
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "photos": 1,
                    "price": 1,
                    "priceDifference": 1,
                    "city": 1,
                    "state": 1,
                    "categoryId": 1,
                    "attributes": 1,
                    "matchCount": 1,
                }
            },
            {"$limit": 15},
        ]


            similar_products = list(products_collection.aggregate(fallback_pipeline))

        similar_products = convert_objectid(similar_products)

        return {
            "count": len(similar_products),
            "data": similar_products
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Include Router
app.include_router(router)

# ✅ Export router so main.py can include it
router = router


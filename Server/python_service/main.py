from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from products import router as products_router  # Import router from products.py
from compare_api import app as compare_app     # Import compare API app
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from products import router as products_router  # Import router from products.py
from compare_api import app as compare_app     # Import compare API app
from ocr_api import router as ocr_router


app = FastAPI()

# ✅ Enable CORS globally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Mount routes from both files
app.include_router(products_router)  # from products.py
app.mount("/", compare_app)          # mount compare_api routes at same base
# ✅ Mount routes from both files
app.include_router(products_router)  # from products.py
app.mount("/", compare_app)          # mount compare_api routes at same base
app.include_router(ocr_router)        #  Mount OCR routes


@app.get("/")
def home():
    return {"message": "🚀 Unified FastAPI is running with both /products and /compare endpoints"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

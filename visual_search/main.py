# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from PIL import Image
import io
import torch
import clip  # OpenAI CLIP

# FastAPI app setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Request body schema
class ImageUrl(BaseModel):
    url: str

@app.post("/embed")
def get_embedding(data: ImageUrl):
    try:
        # 1. Download image from URL
        response = requests.get(data.url)
        image = Image.open(io.BytesIO(response.content)).convert("RGB")

        # 2. Preprocess & get embedding
        image_input = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = model.encode_image(image_input).cpu().numpy().tolist()[0]

        # 3. Return vector
        return {"embedding": embedding}

    except Exception as e:
        return {"error": str(e)}

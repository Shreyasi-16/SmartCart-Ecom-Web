# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from io import BytesIO
from PIL import Image
import torch
import clip  # pip install git+https://github.com/openai/CLIP.git

app = FastAPI()

# Load the CLIP model once
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
print("✅ CLIP model loaded on", device)

class ImageURL(BaseModel):
    url: str

@app.post("/embed")
def generate_embedding(image_data: ImageURL):
    try:
        # Download the image from Cloudinary
        response = requests.get(image_data.url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Cannot download image")

        image = Image.open(BytesIO(response.content)).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            embedding = model.encode_image(image_input)
            embedding = embedding[0].cpu().numpy().tolist()  # convert to list

        return {"embedding": embedding}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from PIL import Image
import io
import torch
import clip  # OpenAI CLIP

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

class ImageUrl(BaseModel):
    url: str

@app.post("/embed")
def get_embedding(data: ImageUrl):
    try:
        # 1️⃣ Download image
        try:
            response = requests.get(data.url, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")

        # 2️⃣ Open image
        try:
            image = Image.open(io.BytesIO(response.content)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

        # 3️⃣ Preprocess & get embedding
        image_input = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = model.encode_image(image_input).cpu().numpy().tolist()[0]

        # 4️⃣ Return vector
        return {"embedding": embedding}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

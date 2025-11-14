from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse
from rembg import remove
from PIL import Image
import numpy as np
import cv2
import tempfile
import io

router = APIRouter(prefix="/api/preprocess", tags=["Preprocess"])

@router.post("/process")
async def preprocess_image(file: UploadFile = File(...)):

    contents = await file.read()

    # Load original image
    orig = Image.open(io.BytesIO(contents)).convert("RGB")

    # -----------------------------
    # 1️⃣ Background Removal (RGBA)
    # -----------------------------
    removed = remove(contents)
    rgba = Image.open(io.BytesIO(removed)).convert("RGBA")

    arr = np.array(rgba)
    rgb = arr[..., :3]
    alpha = arr[..., 3] / 255.0

    h, w = rgb.shape[:2]

    # -----------------------------
    # 2️⃣ DOWNSCALE (CRITICAL!!)
    # -----------------------------
    max_side = 1800
    scale = max_side / max(h, w)

    if scale < 1:
        new_w = int(w * scale)
        new_h = int(h * scale)
        rgb = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
        alpha = cv2.resize(alpha, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # -----------------------------
    # 3️⃣ Soft Neutral Background
    # -----------------------------
    bg = np.full_like(rgb, 220)

    blended = (rgb * alpha[..., None] + bg * (1 - alpha[..., None])).astype(np.uint8)

    # -----------------------------
    # 4️⃣ Padding
    # -----------------------------
    pad = int(max(blended.shape[:2]) * 0.05)
    padded = cv2.copyMakeBorder(
        blended, pad, pad, pad, pad,
        cv2.BORDER_CONSTANT,
        value=[220, 220, 220]
    )

    # -----------------------------
    # 5️⃣ Save as Temporary JPG
    # -----------------------------
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    Image.fromarray(padded).save(tmp.name, "JPEG", quality=92)

    return FileResponse(tmp.name, media_type="image/jpeg")
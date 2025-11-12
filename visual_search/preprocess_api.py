# preprocess_api.py
from fastapi import APIRouter, UploadFile, File
from typing import List
import cv2
import numpy as np
from rembg import remove
from PIL import Image
import io, base64, tempfile, os

router = APIRouter(prefix="/api", tags=["Preprocessing"])

@router.post("/preprocess")
async def preprocess_images(images: List[UploadFile] = File(...)):
    """
    Accepts multipart/form-data: images[]
    Returns JSON: [{ name, image (base64), mask (base64) }]
    Performs background removal, denoise, contrast, sharpen, resize.
    """
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for f in images:
            name = f.filename
            in_path = os.path.join(tmp, name)
            out_path = os.path.join(tmp, f"processed_{name}")
            mask_path = os.path.join(tmp, f"mask_{name}")

            # Save uploaded image
            with open(in_path, "wb") as fp:
                fp.write(await f.read())

            # --- Step 1: Remove background using rembg ---
            with open(in_path, "rb") as inp:
                input_bytes = inp.read()
            result_bytes = remove(input_bytes)
            img = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

            # --- Step 2: Extract RGB + Alpha channels ---
            arr = np.array(img)
            rgb = arr[..., :3]
            alpha = arr[..., 3]

            # Create binary mask
            mask = (alpha > 10).astype(np.uint8) * 255

            # --- Step 3: Clean background ---
           # rgb[alpha < 10] = [255, 255, 255]  # white background
            # Replace transparent areas with neutral gray instead of white
            gray_bg = np.full_like(rgb, 180, dtype=np.uint8)
            rgb = np.where(alpha[..., None] > 10, rgb, gray_bg)

            

            # --- Step 4: Denoise, enhance, sharpen ---
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 10, 10, 7, 21)

            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            lab = cv2.merge((cl, a, b))
            bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            bgr = cv2.filter2D(bgr, -1, kernel)

            h, w = bgr.shape[:2]
            if w > 4000:
                scale = 4000 / w
                bgr = cv2.resize(bgr, (4000, int(h * scale)), interpolation=cv2.INTER_AREA)

            cv2.imwrite(out_path, bgr)
            cv2.imwrite(mask_path, mask)

            with open(out_path, "rb") as fo:
                img_b64 = base64.b64encode(fo.read()).decode("utf-8")
            with open(mask_path, "rb") as fm:
                mask_b64 = base64.b64encode(fm.read()).decode("utf-8")

            results.append({"name": name, "image": img_b64, "mask": mask_b64})

    return results

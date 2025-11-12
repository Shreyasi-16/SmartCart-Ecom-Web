from flask import  jsonify
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import requests
import re
from bson import ObjectId
from pymongo import MongoClient
import httpx 

router = APIRouter(prefix="/ocr", tags=["OCR"])

# === OCR.space API key ===
OCR_API_KEY = "K84601114688957"
OCR_URL = "https://api.ocr.space/parse/image"

# === MongoDB connection ===
MONGO_URI = "mongodb+srv://SmartCart:SmartCart07@cluster0.3opek4y.mongodb.net/SmartCart?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["SmartCart"]
verification_collection = db["verification_documents"]

# ------------------------------------------------------------
# Helper functions for parsing based on document type
# ------------------------------------------------------------

def extract_aadhar_details(text):
    text = text.lower()
    data = {}
    match_name = re.search(r"([a-z]+\s+[a-z]+\s*[a-z]*)\s*\n.*dob", text)
    if not match_name:
        match_name = re.search(r"(name[:\s]*)([a-z\s]+)", text)
    if match_name:
        name_text = match_name.group(1) if len(match_name.groups()) == 1 else match_name.group(2)
        data["name"] = name_text.strip().title()
    match_dob = re.search(r"dob[:\s]*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4})", text)
    if match_dob:
        data["dob"] = match_dob.group(1)
    match_aadhar = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", text)
    if match_aadhar:
    # remove spaces
        aadhar_str = match_aadhar.group(1).replace(" ", "")
        data["aadhar_number"] = float(aadhar_str)
    else:
        data["aadhar_number"] = "Not found"
    return data


def extract_rcbook_details(text):
    text = text.lower()
    data = {}
    def find_field(pattern, multiline=False):
        flags = re.IGNORECASE | re.DOTALL
        if multiline:
            flags |= re.MULTILINE
        match = re.search(pattern, text, flags)
        if match:
            return ' '.join(match.group(1).split()).strip().title()
        return None
    data["reg_no"] = find_field(r"reg\.\s*no\.\s*([a-z0-9]+)")
    data["reg_date"] = find_field(r"date\s*of\s*reg\.\s*([\d/]+)")
    data["reg_validity"] = find_field(r"reg\.\s*validity\s*([\d/]+)")
    data["chassis_no"] = find_field(r"chassis\s*no\.\s*([a-z0-9]+)")
    data["engine_no"] = find_field(r"engine\s*no\.\s*([a-z0-9]+)")
    data["vehicle_class"] = find_field(r"vehicle\s*class\s*([^\n]+)", multiline=True)
    data["owner_name"] = find_field(r"owner\s*name\s*([^\n]+)", multiline=True)
    final_data = {k: v for k, v in data.items() if v is not None}
    if not final_data:
        return {"error": "Could not extract any data. Check OCR text quality."}
    return final_data


def _clean_policy(s):
    return re.sub(r"[^0-9/]", "", s or "").strip()


def _first_match(patterns, text, flags=0):
    for p in patterns:
        m = re.search(p, text, flags)
        if m:
            return m.group(1).strip()
    return None


def extract_insurance_details(text):
    import re
    t = text.lower()
    data = {}

    policy_patterns = [
        r"policy\s*(?:no|number)\s*[:\-]?\s*([0-9/ \-]{8,})",
        r"\b([0-9]{3,4}\/[0-9]{6,}\/[0-9]{1,3}\/[0-9]{1,4})\b",
        r"\b([0-9]{3,}\/[0-9]{6,}\/[0-9\/]{3,})\b",
    ]
    raw_policy = _first_match(policy_patterns, t, flags=re.IGNORECASE)
    if raw_policy:
        cleaned = _clean_policy(raw_policy)
        if len(cleaned) >= 8:
            data["policy_number"] = cleaned

    cert_patterns = [
        r"certificate\s*(?:no|number)\s*[:\-]?\s*([a-z0-9\/\- ]{4,})",
        r"\bcert\s*no\s*[:\-]?\s*([a-z0-9\/\- ]{4,})",
    ]
    raw_cert = _first_match(cert_patterns, t, flags=re.IGNORECASE)
    if raw_cert:
        data["certificate_no"] = raw_cert.strip().upper()

    issued_patterns = [
        r"policy\s*issued\s*on\s*[:\-]?\s*([a-z]{3,9}\s*\d{1,2},?\s*\d{4})",
        r"policy\s*issued\s*on\s*[:\-]?\s*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4})",
    ]
    issued = _first_match(issued_patterns, text, flags=re.IGNORECASE)
    if issued:
        data["policy_issued_on"] = issued.strip().title()

    m = re.search(r"\b([a-z]{2}\d{1,2}[a-z]{1,2}\d{3,5})\b", t)
    if m:
        data["vehicle_number"] = m.group(1).upper()

    m = re.search(
        r"(?:vehicle\s*registration\s*date[:\s\-]*)\s*"
        r"([a-z]{3,9}\s*\d{1,2},?\s*\d{4}|[0-9]{2}[-/][0-9]{2}[-/][0-9]{4})",
        text,
        flags=re.IGNORECASE,
    )
    if m:
        data["vehicle_registration_date"] = m.group(1).strip().title()

    validity_patterns = [
        r"midnight\s*(?:of\s*)?([a-z]{3,9}\s*\d{1,2},?\s*\d{4})",
        r"valid\s*(?:upto|until|till|up to)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
        r"to\s*[:\-]?\s*([a-z]{3,9}\s*\d{1,2},?\s*\d{4})",
    ]
    for p in validity_patterns:
        m = re.search(p, text, flags=re.IGNORECASE)
        if m:
            data["insurance_validity_date"] = m.group(1).strip().title()
            break

    if "insurance_validity_date" not in data:
        m = re.search(
            r"valid\s*(?:upto|until|up to)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
            text,
            re.IGNORECASE,
        )
        if m:
            data["insurance_validity_date"] = m.group(1).strip()

    return data


def extract_puc_details(text):
    import re
    from datetime import datetime
    t = text.lower()
    data = {}
    cert_patterns = [
    # Pattern 1: standard label like "Certificate Sl. No" or "Certificate No"
        r"certificate\s*(?:sl\.?|no\.?|number|serial\s*no\.?)\s*[:\-]?\s*([A-Z0-9]{5,20})",

    # Pattern 2: Gujarat PUC code directly like GJ00500130031743
        r"\b(GJ0[0-9]{12,15})\b",

    # Pattern 3: backup for slightly different OCR outputs
        r"\b(GJ[A-Z0-9]{10,17})\b",
    ]

    m = _first_match(cert_patterns, t, flags=re.IGNORECASE)
    if m:
        data["certificate_no"] = m.strip().upper()

    reg_patterns = [
        r"registration\s*(?:no|number)\s*[:\-]?\s*([a-z]{2}\s*\d{1,2}\s*[a-z]{1,2}\s*\d{3,5})",
        r"\b([a-z]{2}\s*\d{1,2}\s*[a-z]{1,2}\s*\d{3,5})\b",
    ]
    reg = _first_match(reg_patterns, text, flags=re.IGNORECASE)
    if reg:
        data["vehicle_number"] = reg.replace(" ", "").upper()
    date_patterns = [
        r"date\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
    ]
    valid_patterns = [
        r"valid\s*(?:upto|until|till|up to)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
        r"validity\s*(?:upto|until|up to)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
    ]
    issue_date = _first_match(date_patterns, text, flags=re.IGNORECASE)
    if issue_date:
        data["issued_date"] = issue_date.strip().replace("-", "/")
    m = _first_match(valid_patterns, text, flags=re.IGNORECASE)
    if m:
        raw_date = m.strip().replace("-", "/")
        data["valid_upto"] = raw_date
        try:
            d, mth, yr = map(int, raw_date.split("/"))
            if yr < 100:
                yr += 2000
            current_year = datetime.now().year
            if "issued_date" in data:
                _, _, issued_year = map(int, data["issued_date"].split("/"))
                if yr <= issued_year:
                    yr = issued_year + 1
            elif yr <= current_year:
                yr = current_year + 1
            data["valid_upto"] = f"{d:02d}/{mth:02d}/{yr}"
        except Exception:
            pass
    return data


def search_and_extract(pattern, text, flags=re.IGNORECASE):
    match = re.search(pattern, text, flags)
    if match:
        return match.group(1).strip().strip('*').strip('[]').strip()
    return None


def extract_noc_details(text):
    text = text.lower()
    multiline_flags = re.IGNORECASE | re.MULTILINE
    data = {
        "noc_number": None,
        "issued_date": None,
        "vehicle_registration_number": None,
        "issuing_authority": None,
        "owner_name": None
    }
    data["noc_number"] = (
        search_and_extract(r"noc\s*number[:\-]?\s*\(?([a-z0-9]+)\)?", text)
        or search_and_extract(r"pane[:\-]?\s*\(?([a-z0-9]+)\)?", text)
        or search_and_extract(r"\b(gj\d{2}[a-z]{1,2}\d{4,6})\b", text)
    )
    data["vehicle_registration_number"] = (
        search_and_extract(r"vehicle\s*registration\s*number[:\-]?\s*([a-z0-9]+)", text)
        or search_and_extract(r"\b(gj\d{2}[a-z]{1,2}\d{4,6})\b", text)
    )
    data["issued_date"] = (
        search_and_extract(r"issued\s*date[:\-]?\s*(.*?)(?:\n|$)", text, flags=multiline_flags)
        or search_and_extract(r"date[:\-]?\s*(.*?)(?:\n|$)", text, flags=multiline_flags)
    )
    data["issuing_authority"] = (
        search_and_extract(r"issuing\s*authority[:\-]?\s*(.*?)(?:\n|$)", text, flags=multiline_flags)
        or search_and_extract(r"(rto\s+[a-z]+)", text)
    )
    data["owner_name"] = (
        search_and_extract(r"owner\s*name\s*to[:\-]?\s*([a-z\s]+)", text)
        or search_and_extract(r"owner\s*name[:\-]?\s*([a-z\s]+)", text)
    )
    return data


def safe_get(data, *keys):
    """Safely get nested keys from dict without raising AttributeError."""
    for key in keys:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
    return data


# ------------------------------------------------------------
# Main OCR extraction route
# ------------------------------------------------------------

@router.post("/extract_text/{doc_id}")
async def extract_text(doc_id: str):
    try:
        verification_doc = verification_collection.find_one({"_id": ObjectId(doc_id)})
        if not verification_doc:
            return JSONResponse({"error": "Verification not found"}, status_code=404)

        category_id = verification_doc.get("categoryId")
        product_title = verification_doc.get("productTitle")
        uploaded_files = verification_doc.get("uploadedFiles", {})
        if not uploaded_files:
            return JSONResponse({"error": "No uploaded files found"}), 400

        scan_results = {}
        print(f"🚀 Verification started for category: {category_id}")

        # === OCR extraction for all uploaded files ===
        for key, file_url in uploaded_files.items():
            if not file_url:
                continue

            if "/upload/fl_attachment/" not in file_url:
                file_url = file_url.replace("/upload/", "/upload/fl_attachment/")

            file_type = "pdf" if ".pdf" in file_url.lower() else "image"
            print(f"🔍 Scanning {key} ({file_type}) from {file_url}")

            payload = {
                "url": file_url,
                "apikey": OCR_API_KEY,
                "language": "eng",
                "OCREngine": 2,
                "filetype": file_type,
                "isOverlayRequired": False,
            }

            try:
                async with httpx.AsyncClient() as client:
                    ocr_response = await client.post(OCR_URL, data=payload)
                    result_json = ocr_response.json()
            except Exception as e:
                print(f"❌ OCR request failed for {key}: {e}")
                continue

            parsed_text = ""
            if result_json.get("ParsedResults"):
                parsed_text = result_json["ParsedResults"][0].get("ParsedText", "").strip().lower()

            structured_data = {}
            if key == "aadhaar":
                structured_data = extract_aadhar_details(parsed_text)
            elif key == "rcbook":
                structured_data = extract_rcbook_details(parsed_text)
            elif key == "insurance":
                structured_data = extract_insurance_details(parsed_text)
            elif key == "puc":
                structured_data = extract_puc_details(parsed_text)
            elif key == "noc":
                structured_data = extract_noc_details(parsed_text)
            else:
                structured_data = {"raw_text": parsed_text}

            scan_results[key] = {
                "fileUrl": file_url,
                "extractedData": structured_data,
            }

        # === Vehicle number matching logic ===
        vehicle_numbers = []
        for doc_type in ["rcbook", "insurance", "puc", "noc"]:
            extracted = safe_get(scan_results, doc_type, "extractedData")
            if isinstance(extracted, dict):
                vnum = (
                    extracted.get("reg_no")
                    or extracted.get("vehicle_number")
                    or extracted.get("registration_number")
                    or extracted.get("vehicle_registration_number")
                )
                if vnum:
                    vehicle_numbers.append(vnum.strip().upper())

        same_vehicle = len(set(vehicle_numbers)) <= 1 and len(vehicle_numbers) > 0
        vehicle_match_status = (
            "All documents have the same vehicle number"
            if same_vehicle
            else "Mismatch in vehicle numbers across documents"
        )
        scan_results["vehicle_match_status"] = vehicle_match_status

        verification_info = None
        new_status = "pending"

        # ---------------- CATEGORY-BASED LOGIC ----------------

        # CATEGORY 8 → Registration Verification
        if category_id == 8:
            registration_file = uploaded_files.get("registration")

            if registration_file and registration_file.strip() and not registration_file.lower().startswith("no "): 
                extracted_reg_data = safe_get(scan_results, "registration", "extractedData")

                if extracted_reg_data and isinstance(extracted_reg_data, dict) and len(extracted_reg_data) > 0:
                    new_status = "verified"
                    scan_results["verification_check"] = {
                        "verification_status": "Registration document uploaded and verified successfully"
                    }
                else:
                    new_status = "suspect"
                    scan_results["verification_check"] = {
                        "verification_status": "Registration file uploaded but OCR data missing or unreadable"
                    }
            else:
                new_status = "pending"
                scan_results["verification_check"] = {
                    "verification_status": "No registration document uploaded — verification failed"
                }

        #  CATEGORY 2, 4, 5, 6, 7 → Bill & Warranty Card Verification
        elif category_id in [2, 4, 5, 6, 7]:
            def is_valid_file(value):
                """Rejects 'No bill', 'No warranty card', empty, or None."""
                if not value or not isinstance(value, str):
                    return False
                val = value.strip().lower()
                return not (val.startswith("no ") or "no " in val or val in ["", "none", "null"])
            bill_file = uploaded_files.get("bill")
            warranty_file = uploaded_files.get("warranty")

            has_bill = is_valid_file(bill_file)
            has_warranty = is_valid_file(warranty_file)

            if has_bill and has_warranty:
                new_status = "Document Uploaded"
                scan_results["verification_check"] = {
                    "verification_status": "Bill and warranty card verified successfully"
                }
            elif has_bill or has_warranty:
                new_status = "suspect"
                scan_results["verification_check"] = {
                    "verification_status": "Only one document uploaded — verification suspect"
                }
            else:
                new_status = "pending"
                scan_results["verification_check"] = {
                    "verification_status": "No bill or warranty card uploaded"
                }

        # ✅ OTHER VEHICLE-RELATED CATEGORIES (RC, Insurance, PUC, NOC)
        elif same_vehicle:
            vehicle_number = vehicle_numbers[0].upper()
            verification_data_collection = db["verification_data"]
            record = verification_data_collection.find_one({"vehicle_number": vehicle_number})
            verification_info = {}

            if record:
                verification_info["database_info"] = {
                    "categoryType": record.get("categoryType"),
                    "vehicle_number": record.get("vehicle_number"),
                    "rcBook_chassis_no": record.get("rcBook_chassis_no"),
                    "engine_no": record.get("engine_no"),
                    "puc_certificate_no": record.get("puc_certificate_no"),
                    "policy_number": record.get("policy_number"),
                    "aadhar_number": record.get("aadhar_number"),
                    "owner_name": record.get("owner_name"),
                    "rcbook_validity": record.get("rcbook_validity"),
                    "insurance_validity": record.get("insurance_validity"),
                    "puc_validity": record.get("puc_validity"),
                }

                extracted_info = {
                    "categoryType": safe_get(scan_results, "rcbook", "extractedData", "vehicle_class"),
                    "vehicle_number": vehicle_number,
                    "rcBook_chassis_no": safe_get(scan_results, "rcbook", "extractedData", "chassis_no"),
                    "engine_no": safe_get(scan_results, "rcbook", "extractedData", "engine_no"),
                    "policy_number": safe_get(scan_results, "insurance", "extractedData", "policy_number"),
                    "puc_certificate_no": safe_get(scan_results, "puc", "extractedData", "certificate_no"),
                    "aadhar_number": safe_get(scan_results, "aadhaar", "extractedData", "aadhar_number"),
                    "owner_name": safe_get(scan_results, "aadhaar", "extractedData", "name"),
                    "rcbook_validity": safe_get(scan_results, "rcbook", "extractedData", "reg_validity"),
                    "insurance_validity": safe_get(scan_results, "insurance", "extractedData", "insurance_validity_date"),
                    "puc_validity": safe_get(scan_results, "puc", "extractedData", "valid_upto"),
                }

                comparison = {}
                for key, db_value in verification_info["database_info"].items():
                    extracted_value = extracted_info.get(key)
                    if not extracted_value:
                        comparison[key] = "Not found in uploaded document"
                    elif str(db_value).strip().lower() == str(extracted_value).strip().lower():
                        comparison[key] = "Match"
                    else:
                        comparison[key] = f"Mismatch (DB: {db_value}, OCR: {extracted_value})"

                verification_info["comparison"] = comparison
                if all(v == "Match" for v in comparison.values()):
                    verification_info["verification_status"] = "Vehicle verified successfully — all fields matched"
                    new_status = "verified"
                else:
                    verification_info["verification_status"] = "Verification suspect — some fields mismatched or missing"
                    new_status = "suspect"

            else:
                verification_info = {
                    "verification_status": "Vehicle not found in verification database"
                }

            scan_results["verification_check"] = verification_info

        else:
            new_status = "suspect"
            scan_results["verification_check"] = {
                "verification_status": "Unable to verify document — category or data mismatch"
            }

        # === Update DB ===
        verification_collection.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"status": new_status, "scanResult": scan_results}},
        )

        print(f" OCR extraction complete for {doc_id}")
        return JSONResponse({
            "message": "OCR extraction and verification completed",
            "verificationId": doc_id,
            "productTitle": product_title if category_id not in [1, 3, 8] else None,
            "scanResult": scan_results,
        }), 200

    except Exception as e:
        print("Error:", e)
        return JSONResponse({"error": str(e)}, status_code=500)

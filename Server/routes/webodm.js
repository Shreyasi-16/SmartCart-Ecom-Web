// Server/routes/webodm.js
// Robust WebODM integration: safe polling, robust GLB download with fallback, Product updates & SSE emits

const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { GridFSBucket, ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const updates = require("../utils/updates"); // SSE emitter
const AdmZip = require("adm-zip");
const obj2gltf = require("obj2gltf");
const gltfPipeline = require("gltf-pipeline");

const router = express.Router();

// ────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────
const TMP_DIR = path.join(__dirname, "..", "tmp", "webodm");
fs.ensureDirSync(TMP_DIR);

const WEBODM_BASE = process.env.WEBODM_BASE || "http://127.0.0.1:8001";
const WEBODM_USER = process.env.WEBODM_USER || "admin";
const WEBODM_PASS = process.env.WEBODM_PASS || "Saemap_05";
const WEBODM_PROJECT_ID = process.env.WEBODM_PROJECT_ID || "6"; // adjust if needed

// safe emitter fallback
if (!updates || typeof updates.emit !== "function") {
  console.warn("[webodm] updates.emit missing — using no-op");
  updates.emit = () => {};
}

// helpers
function safeFilename(name, fallback = "upload") {
  if (!name) return `${Date.now()}-${fallback}`;
  try {
    return `${Date.now()}-${String(name).replace(/\s+/g, "_")}`;
  } catch (e) {
    return `${Date.now()}-${fallback}`;
  }
}

async function fetchWebODMToken() {
  try {
    const resp = await axios.post(
      `${WEBODM_BASE}/api/token-auth/`,
      { username: WEBODM_USER, password: WEBODM_PASS },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    console.log("[webodm] ✅ token fetched");
    return resp.data.token;
  } catch (err) {
    console.error("❌ Failed to fetch WebODM token:", err?.response?.data || err.message);
    throw new Error("Cannot fetch WebODM token");
  }
}

/**
 * Try to download GLB from multiple potential WebODM endpoints.
 * If direct GLB download fails, will try zip extraction and obj->glb conversion.
 */
async function downloadAndStoreGLB(taskId, token, productId) {
  const conn = mongoose.connection;
  if (!conn || !conn.db) throw new Error("MongoDB not connected");
  const bucket = new GridFSBucket(conn.db, { bucketName: "models" });

  const candidates = [
    `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/model.glb`,
    `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.glb`,
    `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.zip`,
    `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/odm_texturing_25dmesh.zip`,
    `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/all.zip`
  ];

  const headers = { Authorization: `JWT ${token}` };

  const tmpDir = path.join(TMP_DIR, `task-${taskId}`);
  await fs.remove(tmpDir).catch(() => {});
  await fs.ensureDir(tmpDir);

  // helper to stream url -> path
  async function streamUrlToFile(url, outPath) {
    const resp = await axios.get(url, { headers, responseType: "stream", timeout: 0 });
    await new Promise((resolve, reject) => {
      const w = fs.createWriteStream(outPath);
      resp.data.pipe(w);
      w.on("finish", resolve);
      w.on("error", reject);
    });
    return outPath;
  }

  for (const url of candidates) {
    try {
      console.log(`[webodm] trying candidate: ${url}`);
      // If url ends with .glb -> stream directly into GridFS
      if (url.toLowerCase().endsWith(".glb")) {
        const resp = await axios.get(url, { headers, responseType: "stream", timeout: 0 });
        // if 404 or HTML returned, axios will throw; otherwise stream
        const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
        resp.data.pipe(uploadStream);
        await new Promise((resolve, reject) => {
          uploadStream.on("finish", resolve);
          uploadStream.on("error", reject);
        });
        console.log(`[webodm] ✅ stored GLB from ${url} id=${uploadStream.id}`);
        return String(uploadStream.id);
      }

      // otherwise download and inspect
      const outFile = path.join(tmpDir, path.basename(url));
      await streamUrlToFile(url, outFile);

      // if zip -> extract and search for .glb or .obj
      if (outFile.toLowerCase().endsWith(".zip")) {
        const zip = new AdmZip(outFile);
        zip.extractAllTo(tmpDir, true);
        const files = await fs.readdir(tmpDir);
        const foundGlb = files.find(f => f.toLowerCase().endsWith(".glb"));
        if (foundGlb) {
          const full = path.join(tmpDir, foundGlb);
          const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
          fs.createReadStream(full).pipe(uploadStream);
          await new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
          });
          console.log(`[webodm] ✅ stored GLB from zip id=${uploadStream.id}`);
          return String(uploadStream.id);
        }

        const foundObj = files.find(f => f.toLowerCase().endsWith(".obj"));
        if (foundObj) {
          const objPath = path.join(tmpDir, foundObj);
          const gltf = await obj2gltf(objPath);
          const { glb } = await gltfPipeline.processGltf(gltf);
          const outGlb = path.join(tmpDir, "converted.glb");
          await fs.writeFile(outGlb, glb);
          const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
          fs.createReadStream(outGlb).pipe(uploadStream);
          await new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
          });
          console.log(`[webodm] ✅ converted OBJ->GLB and stored id=${uploadStream.id}`);
          return String(uploadStream.id);
        }
      }

      // if we downloaded a non-zip file that looks like a binary -> upload it
      if (await fs.pathExists(outFile)) {
        const st = await fs.stat(outFile);
        if (st.size > 0) {
          const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
          fs.createReadStream(outFile).pipe(uploadStream);
          await new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
          });
          console.log(`[webodm] ✅ stored downloaded file as glb id=${uploadStream.id}`);
          return String(uploadStream.id);
        }
      }
    } catch (err) {
      console.warn(`[webodm] candidate failed: ${url} -> ${err.message}`);
      continue;
    }
  }

  // nothing worked
  throw new Error("Could not download GLB from any known WebODM endpoint");
}

/**
 * Robust poller: waits until WebODM marks task as finished or failed.
 * Emits progress via updates.emit(productId, { type: 'progress', ... })
 */
async function waitForTaskCompletionAndEmit(taskId, token, productId) {
  let currentToken = token;
  const start = Date.now();
  const projectTaskUrl = (tid) => `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${tid}/`;
  const fallbackTaskUrl = (tid) => `${WEBODM_BASE}/api/tasks/${tid}/`;

  while (true) {
    let resp;
    let usedUrl = projectTaskUrl(taskId);
    try {
      resp = await axios.get(usedUrl, { headers: { Authorization: `JWT ${currentToken}` }, timeout: 15000 });
    } catch (err) {
      // try fallback URL if first gave 404/html
      const statusCode = err?.response?.status;
      const bodySnippet = err?.response?.data ? String(err.response.data).slice(0, 400) : err.message;
      console.warn(`[webodm] poll error (url=${usedUrl} status=${statusCode}):`, err.message);
      // if 404 or HTML, try fallback endpoint once
      if (statusCode === 404 || /<!doctype html>/i.test(bodySnippet)) {
        try {
          usedUrl = fallbackTaskUrl(taskId);
          resp = await axios.get(usedUrl, { headers: { Authorization: `JWT ${currentToken}` }, timeout: 15000 });
        } catch (err2) {
          // token issues? refresh
          const statusCode2 = err2?.response?.status;
          const bodySnippet2 = err2?.response?.data ? String(err2.response.data).slice(0, 400) : err2.message;
          if (statusCode2 === 401 || /Signature has expired/i.test(bodySnippet2) || /Authentication credentials were not provided/i.test(bodySnippet2)) {
            try {
              console.log("[webodm] token expired — refreshing token");
              currentToken = await fetchWebODMToken();
              process.env.WEBODM_TOKEN = currentToken;
              // loop will retry
              await new Promise(r => setTimeout(r, 500));
              continue;
            } catch (tErr) {
              console.error("[webodm] token refresh failed:", tErr.message || tErr);
              updates.emit(productId, { type: "error", message: "Auth refresh failed" });
            }
          }
          // can't reach task endpoint — wait and retry
          updates.emit(productId, { type: "error", message: "Cannot reach WebODM task endpoint" });
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
      } else {
        // handle auth errors
        if (statusCode === 401 || /Signature has expired/i.test(bodySnippet) || /Authentication credentials were not provided/i.test(bodySnippet)) {
          try {
            console.log("[webodm] token invalid — refreshing");
            currentToken = await fetchWebODMToken();
            process.env.WEBODM_TOKEN = currentToken;
            await new Promise(r => setTimeout(r, 500));
            continue;
          } catch (tErr) {
            console.error("[webodm] token refresh failed:", tErr.message || tErr);
            updates.emit(productId, { type: "error", message: "Auth refresh failed" });
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
        }
        updates.emit(productId, { type: "error", message: "Polling error" });
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
    }

    const data = resp.data || {};
    // Accept numeric or string status; normalize safely
    const rawStatus = data.status ?? data.state ?? data.processing_status ?? "";
    const statusStr = String(rawStatus || "").toUpperCase();
    // numericStatus used because older WebODM uses numeric codes (20, 40 etc)
    const numericStatus = Number.isFinite(Number(rawStatus)) ? Number(rawStatus) : null;
    // progress may be fractional 0..1 or 0..100; normalize to 0..100
    let progress = 0;
    if (typeof data.running_progress === "number") progress = data.running_progress;
    else if (typeof data.upload_progress === "number") progress = data.upload_progress;
    else if (typeof data.progress === "number") progress = data.progress;
    // If running_progress appears as fractional 0..1 => convert
    if (progress > 0 && progress <= 1) progress = Math.round(progress * 100 * 1000) / 1000; // preserve precision
    // If progress looks like 0..1 string
    if (!progress && data.running_progress && String(data.running_progress).includes(".")) {
      const asNum = Number(data.running_progress);
      if (!Number.isNaN(asNum) && asNum <= 1) progress = Math.round(asNum * 100 * 1000) / 1000;
    }

    // Emit and update product
    updates.emit(productId, { type: "progress", progress, status: statusStr, rawStatus });
    await Product.findByIdAndUpdate(productId, { $set: { modelStatus: "processing", lastProgress: progress } });

    // Completion detection:
    // - numeric status 40 (finished) is common in WebODM
    // - status string "COMPLETED" or "DONE" or data.finished truthy
    // - progress >= 100
    const isCompleted =
      statusStr === "COMPLETED" ||
      statusStr === "DONE" ||
      numericStatus === 40 ||
      (typeof data.finished !== "undefined" && !!data.finished) ||
      progress >= 100;

    if (isCompleted) {
      updates.emit(productId, { type: "completed", status: statusStr || numericStatus || "completed", data });
      return data;
    }

    // Failure detection
    const isFailed =
      statusStr === "FAILED" ||
      statusStr === "ERROR" ||
      statusStr === "CANCELED" ||
      !!data.last_error;

    if (isFailed) {
      updates.emit(productId, { type: "failed", status: statusStr, detail: data.last_error || null, data });
      return data;
    }

    // timeout after 1 hour
    if (Date.now() - start > 60 * 60 * 1000) {
      updates.emit(productId, { type: "failed", status: "timeout" });
      throw new Error("Task timeout");
    }

    // backoff between polls
    await new Promise(r => setTimeout(r, 5000)); // poll every 5s for snappier progress
  }
}

// ────────────────────────────────────────────────
// MAIN: create task and monitor
// ────────────────────────────────────────────────
router.post("/task", async (req, res) => {
  // gather productId robustly from body/query (multiple possible keys)
  const incomingProductId =
    req.body?.productId ||
    req.body?.product_id ||
    req.query?.productId ||
    req.query?.product_id ||
    null;

  console.log("[webodm] incoming productId:", incomingProductId);
  console.log("[webodm] incoming req.files:", Object.keys(req.files || {}));

  const filesToForward = [];
  if (req.files) {
    for (const key of Object.keys(req.files)) {
      const entry = req.files[key];
      if (Array.isArray(entry)) filesToForward.push(...entry);
      else filesToForward.push(entry);
    }
  }

  if (!filesToForward.length) return res.status(400).json({ error: "No files uploaded" });

  const tempPaths = [];
  const form = new FormData();

  const productId = incomingProductId || req.body.productId || req.body.product_id || req.query?.productId || null;
  if (!productId) return res.status(400).json({ error: "Missing productId" });

  try {
    // write files to temp and append
    for (const f of filesToForward) {
      const name = f.name || f.originalname || "file";
      const dest = path.join(TMP_DIR, safeFilename(name, "file"));
      if (typeof f.mv === "function") await f.mv(dest);
      else if (f.data) await fs.writeFile(dest, f.data);
      else if (f.tempFilePath && await fs.pathExists(f.tempFilePath)) await fs.copy(f.tempFilePath, dest);
      else continue;

      form.append("images", fs.createReadStream(dest), { filename: name });
      tempPaths.push(dest);
    }

const token = await fetchWebODMToken();
    process.env.WEBODM_TOKEN = token;
    const webodmCreateUrl = `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/`;

     // ----------------------------
    // High-quality processing options (use WebODM / OpenDroneMap standard keys)
    // NOTE: keys use kebab-case (as WebODM/OpenDroneMap expect).
    // Tweak these to trade quality vs runtime / memory.
    // ----------------------------
    // const highQualityOptions = {
    //   // core reconstruction
    //   "feature-quality": "high",                 // low|medium|high
    //   "matcher-neighbors": 8,
    //   "matcher-distance": 0.7,
    //   "depthmap-resolution": "high",
    //   "depthmap-quality": "ultra",

    //   // mesh generation (increase for more detail; watch RAM)
    //   "mesh-octree-depth": 12,
    //   "meshing-method": "poisson",
    //   "use-3dmesh": true,

    //   // texturing / appearance
    //   "texturing-nlayers": 4,
    //   "texture-size": 4096,           // 8192 is very large; try 4096 first to avoid OOM
    //   "texture-with-mask": true,

    //   // reliability / calibration
    //   "depthmap-min-consistent-views": 3,
    //   "ignore-gsd": false,
    //   "radiometric-calibration": true,

    //   // engine switch if supported
    //   "use-opensfm-depthmap": true
    // };
    const highQualityOptions = {
      // match manual-task attributes
      "auto-boundary": true,
      "dsm": true,

      // quality / reconstruction
      "feature-quality": "high",
      "matcher-neighbors": 8,
      "matcher-distance": 0.7,
      "depthmap-resolution": "high",
      "depthmap-quality": "ultra",

      // meshing
      "mesh-octree-depth": 12,
      "meshing-method": "poisson",
      "use-3dmesh": true,

      // texturing
      "texturing-nlayers": 4,
      "texture-size": 4096,
      "texture-with-mask": true,

      // reliability
      "depthmap-min-consistent-views": 3,
      "ignore-gsd": false,
      "radiometric-calibration": true,
      "use-opensfm-depthmap": true
    };

    // Append options into form as options[key]=value (strings only)
    for (const k of Object.keys(highQualityOptions)) {
      const val = highQualityOptions[k];
      let encoded;
      if (val === null || typeof val === "undefined") encoded = "";
      else if (typeof val === "string") encoded = val;
      else if (typeof val === "boolean" || typeof val === "number") encoded = String(val);
      else encoded = JSON.stringify(val);
      form.append(`options[${k}]`, encoded);
    }
        // --- optionally force the processing node to match your manual run ---
    // WebODM expects the processing_node to be the node's primary key (integer),
    // NOT the node *name*. Provide it via env: WEBODM_PROCESSING_NODE_ID=3
    // If not provided, we won't set processing_node and WebODM will auto-select.
    const processingNodeId = process.env.WEBODM_PROCESSING_NODE_ID;
    if (processingNodeId) {
      // ensure it's numeric when sending
      if (!/^\d$/.test(String(processingNodeId).trim())) {
        console.warn(`[webodm] WEBODM_PROCESSING_NODE_ID env value is not an integer: ${processingNodeId} — skipping processing_node`);
      } else {
        form.append("processing_node", String(processingNodeId).trim());
        console.log(`[webodm] will request processing_node id=${processingNodeId}`);
      }
    } else {
      console.log("[webodm] no WEBODM_PROCESSING_NODE_ID set — letting WebODM choose processing node");
    }

    console.log(`[webodm] → forwarding ${tempPaths.length} files to ${webodmCreateUrl} with high-quality options`);

    const resp = await axios.post(webodmCreateUrl, form, {
      headers: { ...form.getHeaders(), Authorization: `JWT ${token}` },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10 * 60 * 1000,
    });

    console.log("[webodm] create response data:", resp.data || resp);

    // robust extraction of task id (WebODM may respond with id (uuid) or numeric)
    const taskId = String(resp.data?.id ?? resp.data?.uuid ?? resp.data?.task_id ?? resp.data?.taskId ?? resp.data?.id_string ?? "");
    if (!taskId) {
      console.warn("[webodm] could not determine taskId from response");
      return res.status(500).json({ error: "Could not determine WebODM task id", data: resp.data });
    }

    // update product early
    await Product.findByIdAndUpdate(productId, { $set: { webodmTaskId: taskId, modelStatus: "processing", lastProgress: 0 } });

    // monitor asynchronously
    (async () => {
      try {
        const taskData = await waitForTaskCompletionAndEmit(taskId, token, productId);

        // Normalize status safely to string
        const raw = taskData?.status ?? taskData?.state ?? taskData?.processing_status ?? "";
        const statusNormalized = String(raw || "").toUpperCase();
        const numericStatus = Number.isFinite(Number(raw)) ? Number(raw) : null;
        const running_progress = taskData?.running_progress ?? taskData?.progress ?? taskData?.upload_progress ?? 0;
        const progressValue = (typeof running_progress === "number" && running_progress <= 1) ? running_progress * 100 : running_progress;

        const isCompleted =
          statusNormalized === "COMPLETED" ||
          statusNormalized === "DONE" ||
          numericStatus === 40 ||
          progressValue >= 100 ||
          !!taskData?.finished;

         if (isCompleted) {
                  // Try primary download attempt
                  try {
                    const fileId = await downloadAndStoreGLB(taskId, token, productId);
                    await Product.findByIdAndUpdate(productId, { $set: { modelFileId: String(fileId), modelStatus: "ready", lastProgress: 100 } });
                    updates.emit(productId, { type: "completed", modelFileId: String(fileId) });
                    console.log(`[webodm] model saved and product updated: prod=${productId} fileId=${fileId}`);
                    return;
                  } catch (downloadErr) {
                    console.warn("[webodm] direct download failed, will try fallback save-glb endpoint:", downloadErr.message);
                    // Fallback: call your models route that already handles zip/obj conversion: POST /api/webodm/save-glb/:taskId
                    try {
                      const modelsSaveUrl = `http://localhost:5000/api/webodm/save-glb/${taskId}`;
                      const saveResp = await axios.post(modelsSaveUrl, { productId }, { timeout: 5 * 60 * 1000 });
                      const fileId = saveResp.data?.fileId ?? saveResp.data?.fileID ?? saveResp.data?.id ?? null;
                      if (fileId) {
                        await Product.findByIdAndUpdate(productId, { $set: { modelFileId: String(fileId), modelStatus: "ready", lastProgress: 100 } });
                        updates.emit(productId, { type: "completed", modelFileId: String(fileId) });
                        console.log(`[webodm] fallback save-glb succeeded: prod=${productId} fileId=${fileId}`);
                        return;
                      } else {
                        console.warn("[webodm] fallback save-glb returned no fileId:", saveResp.data);
                      }
                    } catch (fallbackErr) {
                      console.error("[webodm] fallback save-glb failed:", fallbackErr.message || fallbackErr);
                    }
                    // if both fail, mark product failed
                    await Product.findByIdAndUpdate(productId, { $set: { modelStatus: "failed" } });
                    updates.emit(productId, { type: "failed", detail: "Could not download or convert GLB" });
                    return;
                  }
                }
        
                // If we get here, the taskData returned but wasn't "completed" (should be rare).
                // Only mark failed if WebODM reported an explicit failure or last_error exists.
                if (isCompleted === false) {
                  const taskFailed = (taskData && (taskData.last_error || String(taskData.status || "").toLowerCase().includes("fail") || String(taskData.state || "").toLowerCase().includes("fail")));
                  if (taskFailed) {
                    await Product.findByIdAndUpdate(productId, { $set: { modelStatus: "failed" } });
                    updates.emit(productId, { type: "failed", detail: taskData?.last_error ?? "Task marked failed by WebODM" });
                    return;
                  } else {
                    // Unknown/edge case: log and attempt fallback save once (maybe WebODM finished assets asynchronously)
                    console.warn("[webodm] monitor: returned taskData not marked completed nor failed; attempting fallback save once");
                    try {
                      const modelsSaveUrl = `http://localhost:5000/api/webodm/save-glb/${taskId}`;
                      const saveResp = await axios.post(modelsSaveUrl, { productId }, { timeout: 5 * 60 * 1000 });
                      const fileId = saveResp.data?.fileId ?? saveResp.data?.fileID ?? saveResp.data?.id ?? null;
                      if (fileId) {
                        await Product.findByIdAndUpdate(productId, { $set: { modelFileId: String(fileId), modelStatus: "ready", lastProgress: 100 } });
                        updates.emit(productId, { type: "completed", modelFileId: String(fileId) });
                        console.log(`[webodm] fallback save-glb succeeded in unknown-state path: prod=${productId} fileId=${fileId}`);
                        return;
                      }
                    } catch (fallbackErr2) {
                      console.warn("[webodm] fallback save-glb in unknown-state path failed:", fallbackErr2.message || fallbackErr2);
                    }
                    // If fallback didn't produce a model, leave product in 'processing' and emit a warning event
                    await Product.findByIdAndUpdate(productId, { $set: { modelStatus: "processing" } });
                    updates.emit(productId, { type: "warning", detail: "Task ended in unknown state; manual check recommended", data: taskData });
                    return;
                }
               }} catch (err) {
        console.error("[webodm] monitor error:", err && err.message ? err.message : err);
        try { await Product.findByIdAndUpdate(productId, { $set: { modelStatus: "failed" } }); } catch(e){}
        updates.emit(productId, { type: "failed", detail: err.message || String(err) });
      }
    })();

    return res.status(201).json({ message: "Task created", taskId });
  } catch (err) {
    console.error("❌ webodm create error:", err?.response?.data ?? err.message ?? err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  } finally {
    // cleanup temp files
    for (const p of tempPaths) fs.remove(p).catch(() => {});
  }
});

module.exports = router;

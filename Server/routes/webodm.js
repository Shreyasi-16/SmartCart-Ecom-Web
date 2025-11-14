// Server/routes/webodm.js
// WebODM integration with background-removed preprocessing + safe high-quality settings

const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const updates = require("../utils/updates");
const AdmZip = require("adm-zip");
const obj2gltf = require("obj2gltf");
const gltfPipeline = require("gltf-pipeline");

const router = express.Router();

// -------------------------------------------------------
// CONFIG
// -------------------------------------------------------
const TMP_DIR = path.join(__dirname, "..", "tmp", "webodm");
fs.ensureDirSync(TMP_DIR);

const WEBODM_BASE = process.env.WEBODM_BASE || "http://127.0.0.1:8001";
const WEBODM_USER = process.env.WEBODM_USER || "admin";
const WEBODM_PASS = process.env.WEBODM_PASS || "Saemap_05";
const WEBODM_PROJECT_ID = process.env.WEBODM_PROJECT_ID || "6";

if (!updates || typeof updates.emit !== "function") {
  updates.emit = () => {};
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

// const { NodeIO } = require("@gltf-transform/core");
// const { bounds, rotateX, rotateZ } = require("@gltf-transform/functions");
// const draco3d = require("draco3dgltf"); // DRACO DECODER
// Correct GLTF-Transform NodeIO for DRACO support
const { NodeIO } = require('@gltf-transform/core');
const { bounds, rotateX, rotateZ } = require('@gltf-transform/functions');
const { KHRDracoMeshCompression } = require('@gltf-transform/extensions');
const draco3d = require('draco3dgltf');


async function autoOrientGLB(inputPath, outputPath) {
  try {
    const { KHRDracoMeshCompression } = require("@gltf-transform/extensions");

    const io = new NodeIO()
      .registerExtensions([KHRDracoMeshCompression])
      .registerDependencies({
        "draco3d.decoder": await draco3d.createDecoderModule(),
      });

    const doc = io.read(inputPath);

    const scene = doc.getRoot().listScenes()[0];
    if (!scene) {
      io.write(outputPath, doc);
      return;
    }

    const box = bounds(scene);
    const dx = Math.abs(box.max[0] - box.min[0]);
    const dy = Math.abs(box.max[1] - box.min[1]);
    const dz = Math.abs(box.max[2] - box.min[2]);

    let rotate = null;

    if (dx > dy && dx > dz) rotate = rotateZ(Math.PI / 2);
    else if (dz > dy && dz > dx) rotate = rotateX(Math.PI / 2);

    if (rotate) await doc.transform(rotate);

    io.write(outputPath, doc);
  } catch (err) {
    console.error("autoOrientGLB failed:", err);
    await fs.copy(inputPath, outputPath).catch(() => {});
  }
}

function safeFilename(name) {
  return `${Date.now()}-${String(name || "file").replace(/\s+/g, "_")}`;
}

async function fetchWebODMToken() {
  const resp = await axios.post(
    `${WEBODM_BASE}/api/token-auth/`,
    {
      username: WEBODM_USER,
      password: WEBODM_PASS,
    },
    { headers: { "Content-Type": "application/json" }, timeout: 15000 }
  );
  return resp.data.token;
}

async function streamToFile(url, dest, headers) {
  const res = await axios.get(url, { headers, responseType: "stream", timeout: 0 });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(dest);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });
}

// -------------------------------------------------------
// DOWNLOAD GLB
// -------------------------------------------------------
async function downloadAndStoreGLB(taskId, token, productId) {
  const bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "models",
  });

  const tmpDir = path.join(TMP_DIR, `task-${taskId}`);
  await fs.remove(tmpDir).catch(() => {});
  await fs.ensureDir(tmpDir);

  const headers = { Authorization: `JWT ${token}` };

  const candidates = [
    "model.glb",
    "textured_model.glb",
    "textured_model.zip",
    "odm_texturing_25dmesh.zip",
    "all.zip",
  ].map(
    (c) =>
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/${c}`
  );

  for (const url of candidates) {
    try {
      console.log("[webodm] Trying:", url);

      const out = path.join(tmpDir, path.basename(url));
      await streamToFile(url, out, headers);

      // DIRECT .glb
      if (url.toLowerCase().endsWith(".glb")) {
        const raw = path.join(tmpDir, "raw.glb");
        const oriented = path.join(tmpDir, "oriented.glb");

        await fs.copy(out, raw);
        await autoOrientGLB(raw, oriented);

        const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
        fs.createReadStream(oriented).pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on("finish", resolve);
          uploadStream.on("error", reject);
        });

        return String(uploadStream.id);
      }

      // ZIP
      if (url.toLowerCase().endsWith(".zip")) {
        const zip = new AdmZip(out);
        zip.extractAllTo(tmpDir, true);

        const files = await fs.readdir(tmpDir);
        const glbFile = files.find((f) => f.toLowerCase().endsWith(".glb"));
        const objFile = files.find((f) => f.toLowerCase().endsWith(".obj"));

        if (glbFile) {
          const fp = path.join(tmpDir, glbFile);
          const raw = path.join(tmpDir, "raw_from_zip.glb");
          const oriented = path.join(tmpDir, "oriented_from_zip.glb");

          await fs.copy(fp, raw);
          await autoOrientGLB(raw, oriented);

          const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
          fs.createReadStream(oriented).pipe(uploadStream);

          await new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
          });

          return String(uploadStream.id);
        }

        if (objFile) {
          const objPath = path.join(tmpDir, objFile);
          const gltf = await obj2gltf(objPath);
          const { glb } = await gltfPipeline.processGltf(gltf);
          const rawGlbPath = path.join(tmpDir, "converted_raw.glb");
          await fs.writeFile(rawGlbPath, glb);

          const oriented = path.join(tmpDir, "converted_oriented.glb");
          await autoOrientGLB(rawGlbPath, oriented);

          const uploadStream = bucket.openUploadStream(`${productId}-${Date.now()}.glb`);
          fs.createReadStream(oriented).pipe(uploadStream);

          await new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
          });

          return String(uploadStream.id);
        }
      }
    } catch (err) {
      console.log("[webodm] Candidate failed:", err?.message ?? err);
    }
  }

  throw new Error("No GLB file available.");
}

// -------------------------------------------------------
// POLLING
// -------------------------------------------------------
async function waitForTaskCompletion(taskId, token, productId) {
  const url = `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/`;

  const started = Date.now();
  while (true) {
    let data;

    try {
      const resp = await axios.get(url, {
        headers: { Authorization: `JWT ${token}` },
        timeout: 15000,
      });
      data = resp.data;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    const rawStatus = data?.status ?? data?.state ?? "";
    const status = String(rawStatus || "").toUpperCase();

    let progress = 0;
    if (typeof data.running_progress === "number") progress = data.running_progress * 100;
    if (progress > 100) progress = 100;

    updates.emit(productId, { type: "progress", progress, status });

    await Product.findByIdAndUpdate(productId, {
      modelStatus: "processing",
      lastProgress: progress,
    });

    const completed =
      status === "COMPLETED" ||
      status === "DONE" ||
      Number(rawStatus) === 40 ||
      data?.finished === true ||
      progress >= 100;

    if (completed) return data;

    const failed =
      status === "FAILED" ||
      status === "ERROR" ||
      status === "CANCELED" ||
      data?.last_error;

    if (failed) return data;

    if (Date.now() - started > 2 * 60 * 60 * 1000) {
      throw new Error("WebODM task poll timeout");
    }

    await new Promise((r) => setTimeout(r, 5000));
  }
}

// -------------------------------------------------------
// MAIN TASK ROUTE
// -------------------------------------------------------
router.post("/task", async (req, res) => {
  const productId = req.body?.productId || req.query?.productId;
  if (!productId) return res.status(400).json({ error: "Missing productId" });

  const files = Object.values(req.files || {}).flat();
  if (!files.length) return res.status(400).json({ error: "No files uploaded" });

  const form = new FormData();
  const tempPaths = [];

  for (const f of files) {
    const name = f.name || f.originalname || "image.jpg";
    const dest = path.join(TMP_DIR, safeFilename(name));

    if (typeof f.mv === "function") {
      await f.mv(dest);
    } else if (f.data) {
      await fs.writeFile(dest, f.data);
    } else {
      continue;
    }

    try {
      const preForm = new FormData();
      preForm.append("file", fs.createReadStream(dest));

      const processed = await axios.post(
        "http://127.0.0.1:8000/api/preprocess/process",
        preForm,
        {
          headers: preForm.getHeaders(),
          responseType: "arraybuffer",
          timeout: 600000,
        }
      );

      const procPath = path.join(TMP_DIR, `proc-${name}`);
      await fs.writeFile(procPath, processed.data);

      form.append("images", fs.createReadStream(procPath), { filename: name });
      tempPaths.push(procPath);
    } catch (err) {
      console.log("[webodm] Preprocess failed:", err);
      form.append("images", fs.createReadStream(dest), { filename: name });
      tempPaths.push(dest);
    }
  }

  // const opts = {
  //    "feature-quality": "ultra",
  //    "matcher-neighbors": 30,
  //    "matcher-distance": 0.6,
  //    "use-hybrid-bundle-adjustment": true,
  //    "depthmap-resolution": "ultra",
  //    "depthmap-quality": "ultra",
  //   "depthmap-min-consistent-views": 4,
  //    "use-opensfm-depthmap": true,
  //    "meshing-method": "poisson",
  //    "mesh-octree-depth": 14,
  //    "mesh-size": 0,
  //    "use-3dmesh": true,
  //    "texturing-nlayers": 8,
  //    "texturing-data-term": "gmi",
  //    "texture-size": 8192,
  //    "texture-with-mask": true,
  //    "radiometric-calibration": true,
  //    "auto-boundary": false,
  //  };
 const opts = {
     "feature-quality": "ultra",
     "matcher-neighbors": 30,
     "matcher-distance": 0.6,
     "use-hybrid-bundle-adjustment": true,
     "depthmap-resolution": "ultra",
     "depthmap-quality": "ultra",
    "depthmap-min-consistent-views":2,
     "use-opensfm-depthmap": true,
     "meshing-method": "poisson",
     "mesh-octree-depth": 14,
     "mesh-size": 0,
     "use-3dmesh": true,
     "texturing-nlayers": 8,
     "texturing-data-term": "gmi",
     "texture-size": 8192,
     "texture-with-mask": true,
     "radiometric-calibration": true,
     "texturing-keep-unseen-faces": true,
"mesh-triangulation": "delaunay",
"mesh-octree-depth": 12,
"mesh-samples": 1,
"mesh-cleanup": false,

     "auto-boundary": false,
   };



  for (const [k, v] of Object.entries(opts)) {
    form.append(`options[${k}]`, String(v));
  }

  let token;

  try {
    token = await fetchWebODMToken();
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch WebODM token", detail: err.message });
  }

  let resp;
  try {
    resp = await axios.post(
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/`,
      form,
      {
        headers: { ...form.getHeaders(), Authorization: `JWT ${token}` },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 600000,
      }
    );
  } catch (err) {
    return res.status(500).json({ error: "Failed to create WebODM task", detail: err.message });
  }

  const taskId = String(
    resp.data?.id || resp.data?.uuid || resp.data?.task_id || ""
  );

  await Product.findByIdAndUpdate(productId, {
    webodmTaskId: taskId,
    modelStatus: "processing",
    lastProgress: 0,
  });

  (async () => {
    try {
      const result = await waitForTaskCompletion(taskId, token, productId);

      const raw = result?.status ?? result?.state ?? "";
      const statusStr = String(raw).toUpperCase();

      const completed =
        statusStr === "COMPLETED" ||
        statusStr === "DONE" ||
        Number(raw) === 40 ||
        result?.finished;

      if (completed) {
        try {
          const fileId = await downloadAndStoreGLB(taskId, token, productId);
          await Product.findByIdAndUpdate(productId, {
            modelStatus: "ready",
            lastProgress: 100,
            modelFileId: String(fileId),
          });
          updates.emit(productId, { type: "completed", fileId });
        } catch (err) {
          await Product.findByIdAndUpdate(productId, { modelStatus: "failed" });
          updates.emit(productId, { type: "failed", error: err.message });
        }
      } else {
        await Product.findByIdAndUpdate(productId, { modelStatus: "failed" });
        updates.emit(productId, { type: "failed", error: "Task ended unexpectedly" });
      }
    } catch (err) {
      await Product.findByIdAndUpdate(productId, { modelStatus: "failed" });
      updates.emit(productId, { type: "failed", error: err.message });
    } finally {
      for (const p of tempPaths) fs.remove(p).catch(() => {});
    }
  })();

  res.json({ message: "Task created", taskId });
});

module.exports = router;

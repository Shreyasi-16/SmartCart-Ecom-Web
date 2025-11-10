// // Server/routes/models.js
// const express = require("express");
// const axios = require("axios");
// const { ObjectId } = require("mongodb");
// const AdmZip = require("adm-zip");
// const obj2gltf = require("obj2gltf");
// const gltfPipeline = require("gltf-pipeline");
// const fs = require("fs-extra");
// const path = require("path");
// const mongoose = require("mongoose"); // ✅ move mongoose import to top
// const Product = require("../models/Product"); // ✅ added line

// const router = express.Router();

// const WEBODM_BASE = process.env.WEBODM_BASE || "http://127.0.0.1:8001";
// const WEBODM_USER = process.env.WEBODM_USER || "admin";
// const WEBODM_PASS = process.env.WEBODM_PASS || "Saemap_05";
// const WEBODM_PROJECT_ID = process.env.WEBODM_PROJECT_ID || "1";

// // 🔐 Helper — fetch fresh WebODM token
// async function fetchWebODMToken() {
//   const resp = await axios.post(
//     `${WEBODM_BASE}/api/token-auth/`,
//     { username: WEBODM_USER, password: WEBODM_PASS },
//     { headers: { "Content-Type": "application/json" }, timeout: 10000 }
//   );
//   return resp.data.token;
// }

// /**
//  * ✅ POST /api/webodm/save-glb/:taskId
//  * Downloads the 3D model from WebODM, converts to GLB if needed,
//  * uploads it to Mongo GridFS, and returns { fileId, filename, message }
//  */
// router.post("/webodm/save-glb/:taskId", async (req, res) => {
//   const { taskId } = req.params;
//   const tmpDir = path.join(__dirname, "..", "tmp", "models", taskId);
//   await fs.remove(tmpDir);
//   await fs.ensureDir(tmpDir);

//   try {
//     let token = process.env.WEBODM_TOKEN;
//     if (!token) token = await fetchWebODMToken();

//    // Try all possible WebODM download endpoints — include project and task-style endpoints
//     const candidateUrls = [
//       `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/model.glb`,
//       `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.glb`,
//       `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.zip`,
//       `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/odm_texturing_25dmesh.zip`,
//       // Fallback: task-based endpoints (some installs use /api/tasks/<id>/download/...)
//       `${WEBODM_BASE}/api/tasks/${taskId}/download/model.glb`,
//       `${WEBODM_BASE}/api/tasks/${taskId}/download/textured_model.glb`,
//       `${WEBODM_BASE}/api/tasks/${taskId}/download/textured_model.zip`,
//       `${WEBODM_BASE}/api/tasks/${taskId}/download/all.zip`,
//     ];

//     let downloadResp = null;
//         let usedUrl = null;
//         for (const url of candidateUrls) {
//           try {
//             console.log(`[models] trying ${url}`);
//             downloadResp = await axios.get(url, {
//               headers: { Authorization: `JWT ${token}` },
//               responseType: "stream",
//               timeout: 60 * 1000,
//             });
//             usedUrl = url;
//             console.log(`[models] success download candidate ${url} (content-type: ${downloadResp.headers["content-type"] || "unknown"})`);
//             break;
//           } catch (err) {
//             console.log(`❌ Failed ${url} — ${err.message || err}`);
//           }
//         }
//     // let downloadResp = null;
//     // let usedUrl = null;
//     // for (const url of candidateUrls) {
//     //   try {
//     //     downloadResp = await axios.get(url, {
//     //       headers: { Authorization: `JWT ${token}` },
//     //       responseType: "stream",
//     //       timeout: 60 * 1000
//     //     });
//     //     usedUrl = url;
//     //     break;
//     //   } catch (err) {
//     //     console.log(`❌ Failed ${url}`);
//     //   }
//     // }

//     if (!downloadResp) throw new Error("Could not download model from WebODM.");

// //     const contentType = downloadResp.headers["content-type"] || "";
// //     const glbPath = path.join(tmpDir, "model.glb");

// //     // 🟩 Case 1 — GLB directly
// //     if (contentType.includes("model/gltf-binary") || usedUrl.endsWith(".glb")) {
// //       await streamToFile(downloadResp.data, glbPath);
      

// //       const fileId = await uploadToGridFS(glbPath, `task-${taskId}.glb`, taskId);
// // await updateProductWithModel(req, fileId, taskId);
// // return res.json({ fileId, filename: `task-${taskId}.glb`, message: "Stored GLB successfully" });

// //     }
// const contentType = String(downloadResp.headers["content-type"] || "");
//     const glbPath = path.join(tmpDir, "model.glb");

//     // 🟩 Case 1 — GLB directly (stream HTTP response into GridFS without writing to disk)
//     if (contentType.includes("model/gltf-binary") || (usedUrl && usedUrl.toLowerCase().endsWith(".glb"))) {
//       try {
//         // upload stream directly into GridFS
//         if (!mongoose.connection.db) throw new Error("Mongoose DB not ready");
//         const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "models" });
//         const filename = `task-${taskId}.glb`;
//         const uploadStream = bucket.openUploadStream(filename, { metadata: { taskId } });

//         console.log("[models] streaming direct GLB into GridFS...");
//         downloadResp.data.pipe(uploadStream);

//         await new Promise((resolve, reject) => {
//           uploadStream.on("finish", resolve);
//           uploadStream.on("error", reject);
//         });

//         const fileId = String(uploadStream.id);
//         await updateProductWithModel(req, fileId, taskId);
//         return res.json({ fileId, filename, message: "Stored GLB successfully (streamed)" });
//       } catch (err) {
//         console.error("[models] direct GLB stream failed:", err.message || err);
//         // Fallthrough to try saving to disk / zip extraction below
//       }
//     }

//     // 🟧 Case 2 — ZIP file, extract it
//     const zipPath = path.join(tmpDir, "model.zip");
//     await streamToFile(downloadResp.data, zipPath);
//     const zip = new AdmZip(zipPath);
//     zip.extractAllTo(tmpDir, true);

//     // const files = await fs.readdir(tmpDir);
//     // const foundGlb = files.find(f => f.toLowerCase().endsWith(".glb"));
//     // const foundObj = files.find(f => f.toLowerCase().endsWith(".obj"));

//     const files = await fs.readdir(tmpDir);
//     const foundGlb = files.find((f) => f.toLowerCase().endsWith(".glb"));
//     const foundObj = files.find((f) => f.toLowerCase().endsWith(".obj"));
   
// //     if (foundGlb) {
// //       const full = path.join(tmpDir, foundGlb);
// //       const fileId = await uploadToGridFS(full, `task-${taskId}.glb`, taskId);
// // await updateProductWithModel(req, fileId, taskId);
// // return res.json({ fileId, filename: foundGlb, message: "Stored GLB from ZIP" });

// //     }
//  if (foundGlb) {
//       const full = path.join(tmpDir, foundGlb);
//       const fileId = await uploadToGridFS(full, `task-${taskId}.glb`, taskId);
//       await updateProductWithModel(req, fileId, taskId);
//       return res.json({ fileId, filename: foundGlb, message: "Stored GLB from ZIP" });
//     }

//     // 🟥 Case 3 — OBJ -> GLB conversion
// //     if (!foundObj) throw new Error("No .glb or .obj found in archive");
// //     const objPath = path.join(tmpDir, foundObj);
// //     const gltf = await obj2gltf(objPath);
// //     const { glb } = await gltfPipeline.processGltf(gltf);
// //     await fs.writeFile(glbPath, glb);

// //    const fileId = await uploadToGridFS(glbPath, `task-${taskId}.glb`, taskId);
// // await updateProductWithModel(req, fileId, taskId);
// // return res.json({ fileId, filename: "converted.glb", message: "Converted OBJ → GLB and stored" });

// if (!foundObj) throw new Error("No .glb or .obj found in archive");
//     const objPath = path.join(tmpDir, foundObj);
//     const gltf = await obj2gltf(objPath);
//     const { glb } = await gltfPipeline.processGltf(gltf);
//     await fs.writeFile(glbPath, glb);

//     const fileId = await uploadToGridFS(glbPath, `task-${taskId}.glb`, taskId);
//     await updateProductWithModel(req, fileId, taskId);
//     return res.json({ fileId, filename: "converted.glb", message: "Converted OBJ → GLB and stored" });


//   } catch (err) {
//     console.error("save-glb error:", err.message || err);
//     return res.status(500).json({ error: err.message || String(err) });
//   } finally {
//     // Cleanup temporary files
//     // await fs.remove(tmpDir);
//   }
// });

// /**
//  * ✅ GET /api/models/:fileId
//  * Streams the stored GLB file from GridFS
//  */
// router.get("/models/:fileId", async (req, res) => {
//   try {
//     if (!mongoose.connection.db) return res.status(500).send("DB not ready");
//     const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "models" });

//     const fileId = req.params.fileId;
//     if (!ObjectId.isValid(fileId)) return res.status(400).send("Invalid ID");
//     const _id = new ObjectId(fileId);

//     res.setHeader("Content-Type", "model/gltf-binary");
//     res.setHeader("Content-Disposition", `inline; filename="model-${fileId}.glb"`);

//     const downloadStream = bucket.openDownloadStream(_id);
//     downloadStream.on("error", (err) => {
//       console.error("GridFS stream error:", err.message);
//       res.status(404).send("File not found");
//     });
//     downloadStream.pipe(res);
//   } catch (err) {
//     console.error("models/:fileId error:", err);
//     res.status(500).send(err.message || String(err));
//   }
// });

// // --- Utility: Save stream to file ---
// async function streamToFile(stream, dest) {
//   return new Promise((resolve, reject) => {
//     const writer = fs.createWriteStream(dest);
//     stream.pipe(writer);
//     writer.on("finish", resolve);
//     writer.on("error", reject);
//   });
// }

// // --- Utility: Upload file to GridFS ---
// async function uploadToGridFS(filePath, filename, taskId) {
//   if (!mongoose.connection.db) throw new Error("Mongoose DB not ready");
//   const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "models" });
//   const uploadStream = bucket.openUploadStream(filename, { metadata: { taskId } });
//   const fileRead = fs.createReadStream(filePath);
//   return new Promise((resolve, reject) => {
//     fileRead
//       .pipe(uploadStream)
//       .on("error", reject)
//       .on("finish", () => resolve(String(uploadStream.id)));
//   });
// }

// // ✅ Helper to update the Product with model info
// async function updateProductWithModel(req, uploadStreamId, taskId) {
//   try {
//     const productId =
//       req.body?.productId || req.query?.productId || req.params?.productId || null;

//     if (!productId) {
//       console.warn("[models] ⚠️ No productId provided — skipping product update");
//       return;
//     }

//     await Product.findByIdAndUpdate(productId, {
//       modelFileId: String(uploadStreamId),
//       modelStatus: "ready",
//       webodmTaskId: taskId,
//       lastProgress: 100,
//     });

//     console.log(`[models] ✅ Updated Product ${productId} with model ${uploadStreamId}`);
//   } catch (err) {
//     console.error("[models] ❌ Failed to update product:", err.message);
//   }
// }

// module.exports = router;
// Server/routes/models.js
// Robust WebODM model downloader + converter -> GridFS
const express = require("express");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const AdmZip = require("adm-zip");
const obj2gltf = require("obj2gltf");
const gltfPipeline = require("gltf-pipeline");
const fs = require("fs-extra");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

const WEBODM_BASE = process.env.WEBODM_BASE || "http://127.0.0.1:8001";
const WEBODM_USER = process.env.WEBODM_USER || "admin";
const WEBODM_PASS = process.env.WEBODM_PASS || "Saemap_05";
const WEBODM_PROJECT_ID = process.env.WEBODM_PROJECT_ID || "6";

// helper: fetch WebODM JWT token (keeps same behaviour as webodm.js)
async function fetchWebODMToken() {
  try {
    const resp = await axios.post(
      `${WEBODM_BASE}/api/token-auth/`,
      { username: WEBODM_USER, password: WEBODM_PASS },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return resp.data.token;
  } catch (err) {
    console.error("[models] fetch token failed:", err?.response?.data || err.message);
    throw new Error("Cannot fetch WebODM token");
  }
}

// utility: save stream to file
async function streamToFile(stream, dest) {
  await fs.ensureDir(path.dirname(dest));
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    stream.pipe(writer);
    writer.on("finish", () => resolve(dest));
    writer.on("error", (e) => reject(e));
  });
}

// utility: upload a local file to GridFS, returns stringified id
async function uploadToGridFS(filePath, filename, taskId) {
  if (!mongoose.connection.db) throw new Error("Mongoose DB not ready");
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "models" });
  const uploadStream = bucket.openUploadStream(filename, { metadata: { taskId } });
  const rs = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    rs.pipe(uploadStream)
      .on("error", (e) => reject(e))
      .on("finish", () => resolve(String(uploadStream.id)));
  });
}

// helper: update product with model info (if productId provided)
async function updateProductWithModel(productId, uploadStreamId, taskId) {
  try {
    if (!productId) {
      console.warn("[models] no productId provided, skipping Product update");
      return;
    }
    await Product.findByIdAndUpdate(productId, {
      modelFileId: String(uploadStreamId),
      modelStatus: "ready",
      webodmTaskId: taskId,
      lastProgress: 100,
    });
    console.log(`[models] Updated Product ${productId} with model ${uploadStreamId}`);
  } catch (err) {
    console.error("[models] Failed to update product:", err?.message || err);
  }
}

// POST /api/webodm/save-glb/:taskId
// Expects optional { productId } in body or query. Always returns { fileId, filename, message } on success.
router.post("/webodm/save-glb/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const productId = req.body?.productId || req.query?.productId || null;

  const tmpDir = path.join(__dirname, "..", "tmp", "models", taskId);
  await fs.remove(tmpDir).catch(() => {});
  await fs.ensureDir(tmpDir);

  try {
    // prefer stored token else fetch
    let token = process.env.WEBODM_TOKEN;
    if (!token) token = await fetchWebODMToken();

    const headers = { Authorization: `JWT ${token}` };

    // candidate download URLs (ordered)
    const candidateUrls = [
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/model.glb`,
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.glb`,
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/textured_model.zip`,
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/odm_texturing_25dmesh.zip`,
      `${WEBODM_BASE}/api/projects/${WEBODM_PROJECT_ID}/tasks/${taskId}/download/all.zip`
    ];

    let downloadResp = null;
    let usedUrl = null;

    // try each URL until one succeeds (stream response)
    for (const url of candidateUrls) {
      try {
        console.log(`[models] trying ${url}`);
        downloadResp = await axios.get(url, { headers, responseType: "stream", timeout: 60 * 1000 });
        usedUrl = url;
        break;
      } catch (err) {
        console.log(`[models] failed ${url}: ${err?.response?.status ?? err.message}`);
        continue;
      }
    }

    if (!downloadResp) {
      throw new Error("Could not download model from WebODM - no candidate succeeded");
    }

    const contentType = (downloadResp.headers?.["content-type"] || "").toLowerCase();
    const glbPath = path.join(tmpDir, "model.glb");

    // Case A: direct GLB stream
    if (usedUrl.endsWith(".glb") || contentType.includes("model/gltf-binary") || contentType.includes("application/octet-stream")) {
      await streamToFile(downloadResp.data, glbPath);
      const fileId = await uploadToGridFS(glbPath, `task-${taskId}.glb`, taskId);
      await updateProductWithModel(productId, fileId, taskId);
      return res.json({ fileId, filename: `task-${taskId}.glb`, message: "Stored GLB successfully" });
    }

    // Otherwise treat as zip or other archive
    const zipPath = path.join(tmpDir, "model.zip");
    await streamToFile(downloadResp.data, zipPath);

    // Try to extract zip
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tmpDir, true);
    } catch (e) {
      // Not a zip — but we still may have downloaded a binary; attempt to store as GLB if size > 0
      const st = await fs.stat(zipPath);
      if (st.size > 0) {
        const fileId = await uploadToGridFS(zipPath, `task-${taskId}.bin`, taskId);
        await updateProductWithModel(productId, fileId, taskId);
        return res.json({ fileId, filename: path.basename(zipPath), message: "Stored downloaded file (non-zip) to GridFS" });
      }
      throw new Error("Downloaded file not a valid zip or binary");
    }

    // Inspect extracted files
    const files = await fs.readdir(tmpDir);
    // find glb first
    const foundGlb = files.find(f => f.toLowerCase().endsWith(".glb"));
    if (foundGlb) {
      const full = path.join(tmpDir, foundGlb);
      const fileId = await uploadToGridFS(full, foundGlb, taskId);
      await updateProductWithModel(productId, fileId, taskId);
      return res.json({ fileId, filename: foundGlb, message: "Stored GLB from ZIP" });
    }

    // if no glb, look for obj (and potentially its mtl + textures)
    const foundObj = files.find(f => f.toLowerCase().endsWith(".obj"));
    if (foundObj) {
      const objPath = path.join(tmpDir, foundObj);

      // convert obj -> gltf (obj2gltf) then gltf -> glb
      console.log("[models] converting OBJ to GLB:", objPath);
      const gltf = await obj2gltf(objPath);
      const processed = await gltfPipeline.processGltf(gltf);
      const outGlbPath = path.join(tmpDir, "converted.glb");
      await fs.writeFile(outGlbPath, processed.glb);
      const fileId = await uploadToGridFS(outGlbPath, `task-${taskId}.glb`, taskId);
      await updateProductWithModel(productId, fileId, taskId);
      return res.json({ fileId, filename: "converted.glb", message: "Converted OBJ → GLB and stored" });
    }

    // nothing useful found
    throw new Error("No .glb or .obj found inside archive");
  } catch (err) {
    console.error("[models] save-glb error:", err?.message || err);
    return res.status(500).json({ error: err?.message || String(err) });
  } finally {
    // Optional: keep temp for debugging by commenting removal
    // await fs.remove(tmpDir).catch(() => {});
  }
});

/**
 * GET /api/models/:fileId
 * Streams GLB from GridFS.
 */
router.get("/models/:fileId", async (req, res) => {
  try {
    if (!mongoose.connection.db) return res.status(500).send("DB not ready");
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "models" });

    const fileId = req.params.fileId;
    if (!ObjectId.isValid(fileId)) return res.status(400).send("Invalid ID");
    const _id = new ObjectId(fileId);

    res.setHeader("Content-Type", "model/gltf-binary");
    res.setHeader("Content-Disposition", `inline; filename="model-${fileId}.glb"`);

    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on("error", (err) => {
      console.error("[models] GridFS stream error:", err.message);
      try { res.status(404).send("File not found"); } catch(e) {}
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error("[models] GET stream error:", err);
    res.status(500).send(err.message || String(err));
  }
});

module.exports = router;

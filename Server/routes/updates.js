// Server/routes/updates.js
const express = require("express");
const updates = require("../utils/updates");
const router = express.Router();

router.get("/subscribe/:productId", (req, res) => {
  const { productId } = req.params;

  // SSE headers
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });

  // helper to send events
  function sendEvent(obj) {
    try {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    } catch (e) { /* ignore */ }
  }

  // initial ping
  sendEvent({ type: "connected", productId });

  // handler bound to this product
  const handler = (payload) => {
    sendEvent(payload);
  };

  // listen to events for this product
  updates.on(productId, handler);

  // cleanup if client disconnects
  req.on("close", () => {
    updates.removeListener(productId, handler);
  });
});

module.exports = router;

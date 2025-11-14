// server/routes/contactRoutes.js
const express = require("express");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");

const router = express.Router();

// ---------------- GET /fetch-mails ----------------
router.get("/fetch-mails", async (req, res) => {
  const imap = new Imap({
    user: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_EMAIL_PASS,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });

  function openInbox(cb) {
    imap.openBox("INBOX", false, cb);
  }

  imap.once("ready", () => {
    openInbox((err) => {
      if (err) return res.status(500).json({ message: "Failed to open inbox" });

      imap.search(["ALL"], (err, results) => {
        if (err) return res.status(500).json({ message: "Failed to search mails" });
        if (!results || results.length === 0) {
          imap.end();
          return res.json({ total: 0, unread: 0, read: 0, mails: [] });
        }

        const fetchResults = imap.fetch(results.slice(-30), { bodies: "" });
        const mails = [];

        fetchResults.on("message", (msg) => {
          msg.on("body", async (stream) => {
            try {
              const parsed = await simpleParser(stream);

              if (parsed.subject && parsed.subject.toLowerCase().includes("contact us")) {
                // ✅ Get actual user email and name
                const fromValue = parsed.from?.value?.[0] || {};
                const userName = fromValue.name || "(No name)";
                const userEmail = fromValue.address || "(No email)";

                mails.push({
                  from: { name: userName, email: userEmail },
                  subject: parsed.subject,
                  text: parsed.text,
                  date: parsed.date,
                  seen: msg.attributes?.flags?.includes("\\Seen") || false,
                });
              }
            } catch (err) {
              console.error("Parse email error:", err);
            }
          });
        });

        fetchResults.once("end", () => {
          imap.end();
          res.json({
            total: mails.length,
            unread: mails.filter((m) => !m.seen).length,
            read: mails.filter((m) => m.seen).length,
            mails,
          });
        });
      });
    });
  });

  imap.once("error", (err) => {
    console.error("IMAP error:", err);
    res.status(500).json({ message: "Error fetching emails" });
  });

  imap.connect();
});

module.exports = router;

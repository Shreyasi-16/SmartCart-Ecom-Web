const admin = require("../config/firebase");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send("No token provided");
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).send("Unauthorized");
  }
};

module.exports = authenticate;

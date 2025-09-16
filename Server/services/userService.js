const admin = require("../config/firebase");
const User = require("../models/User");

const syncUser = async (req, res) => {
  try {
    const { uid } = req.user;

    const firebaseUser = await admin.auth().getUser(uid);

    const userData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || "",
      email: firebaseUser.email || "",
      phone: firebaseUser.phoneNumber || "",
    aboutMe:firebaseUser.aboutMe || "",
      photoURL: firebaseUser.photoURL || "",
    };

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: userData },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "✅ User synced", user });
  } catch (error) {
    console.error("User sync error:", error);
    res.status(500).send("❌ Failed to sync user");
  }
};

module.exports = { syncUser };

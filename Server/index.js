// Required modules
const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// App setup
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin SDK setup
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB User Schema & Model
const User = mongoose.model('User', new mongoose.Schema({
  uid: String,
  name: String,
  email: String,
  phone: String,
  photoURL: String,
  joinedAt: { type: Date, default: Date.now },
}, { collection: 'users' }));

// 🔐 Middleware: Verify Firebase ID Token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send('No token provided');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).send('Unauthorized');
  }
};

// 🔄 Controller: Sync Firebase User → MongoDB
const syncUser = async (req, res) => {
  try {
    const { uid } = req.user;

    // Fetch full Firebase user profile
    const firebaseUser = await admin.auth().getUser(uid);

    const userData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      phone: firebaseUser.phoneNumber || '',
      photoURL: firebaseUser.photoURL || '',
    };

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: userData },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: '✅ User synced', user });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).send('❌ Failed to sync user');
  }
};

// 🔗 Route
app.post('/sync-user', authenticate, syncUser);

// 🌐 Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running at http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

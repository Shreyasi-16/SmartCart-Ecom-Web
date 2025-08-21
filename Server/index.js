// ===============================
//       Required Modules
// ===============================
const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// ===============================
//       App Setup
// ===============================
const app = express();
app.use(cors());
app.use(express.json());

// ===============================
//   Firebase Admin Setup
// ===============================
const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ===============================
//   Mongoose User Model
// ===============================
const User = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      uid: String,
      name: String,
      email: String,
      phone: String,
      photoURL: String,
      joinedAt: { type: Date, default: Date.now },
    },
    { collection: 'users' }
  )
);

// ===============================
//     Firebase Auth Middleware
// ===============================
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

// ===============================
//   Sync Firebase User → MongoDB
// ===============================
const syncUser = async (req, res) => {
  try {
    const { uid } = req.user;
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

// ===============================
//       Routes
// ===============================
app.post('/sync-user', authenticate, syncUser);

app.get('/', (req, res) => {
  res.send('🚀 Backend is running!');
});

// ===============================
//       MongoClient Setup
// ===============================
const mongoUri = "mongodb+srv://tanzeeem6:K5wI2A1mGKU3vnZl@cluster0.anb1ekt.mongodb.net/";
const client = new MongoClient(mongoUri);

const dbName = 'search-db';
const collectionName = 'products_v1';
let collection; // global reference

async function initMongoClient() {
  try {
    await client.connect();
    console.log("✅ MongoClient connected (for Atlas Search)");
    const db = client.db(dbName);
    collection = db.collection(collectionName);
  } catch (err) {
    console.error("❌ MongoClient connection error:", err);
    process.exit(1);
  }
}

// ===============================
//   Products Routes
// ===============================
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let mongoQuery;

    try {
      mongoQuery = { _id: new ObjectId(id) };
    } catch {
      mongoQuery = { _id: id };
    }

    const result = await collection.findOne(mongoQuery);

    if (!result) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ data: result });
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    const aggregationPipeline = [
      {
        $search: {
          index: "productSearchIndex",
          compound: {
            should: [
              { autocomplete: { query, path: "name", fuzzy: { maxEdits: 1 } } },
              { autocomplete: { query, path: "sub_category", fuzzy: { maxEdits: 1 } } }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $limit: 6 }
    ];

    const results = await collection.aggregate(aggregationPipeline).toArray();
    res.status(200).json({ data: results });
  } catch (err) {
    console.error('❌ Error during search:', err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===============================
//       Start Server
// ===============================
async function startServer() {
  try {
    // Connect MongoClient for Atlas Search
    await initMongoClient();

    // Connect Mongoose
    await mongoose.connect(
      "mongodb+srv://tanzeeem6:K5wI2A1mGKU3vnZl@cluster0.anb1ekt.mongodb.net/smartcart"
    );
    console.log('✅ Mongoose Connected to MongoDB');

    // Start server
    app.listen(3000, () => console.log(`🚀 Server running at http://localhost:3000`));
  } catch (err) {
    console.error('❌ Server startup error:', err);
  }
}

startServer();

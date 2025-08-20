// Required modules
const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb'); // 👉 For Atlas Search

// App setup
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin SDK setup
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB User Schema & Model (Mongoose)
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

// 🔗 Route: Sync user from Firebase
app.post('/sync-user', authenticate, syncUser);

// 🔗 Route: Root
app.get('/', (req, res) => {
  res.send('🚀 Backend is running!');
});


// =======================================
// 🔍 Atlas Search Integration (MongoClient)
// =======================================

// MongoClient setup (used only for search, not auth)
const client = new MongoClient("mongodb+srv://tanzeeem6:K5wI2A1mGKU3vnZl@cluster0.anb1ekt.mongodb.net/");
let mongoClientConnected = false;

const dbName = 'search-db';
const collectionName = 'products_v1';

// 🛍️ Route: Get product by ID           
/*-----------------------------------------
ID ABHI TAK DATASET ME DAALI NAHI HAI 
------------------------------------------ */
/* app.get('/products/:id', async (req, res) => {
  try {
    if (!mongoClientConnected) {
      await client.connect();
      mongoClientConnected = true;
      console.log("✅ MongoClient connected (for Atlas Search)");
    }

    const { id } = req.params;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Try both ObjectId and String match
    let query = [{ _id: id }]; 
    try {
      query.push({ _id: new ObjectId(id) });
    } catch (e) {
      console.warn("⚠️ Not a valid ObjectId, will only check string _id");
    }

    const result = await collection.findOne({ $or: query });

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ data: result });
  } catch (err) {
    console.error("❌ Error fetching product by ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/

// 🔍 Route: Search products by name
app.get('/search', async (req, res) => {
  try {
    if (!mongoClientConnected) {
      await client.connect();
      mongoClientConnected = true;
      console.log("✅ MongoClient connected (for Atlas Search)");
    }

    const { query } = req.query;
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const aggregationPipeline = [
  {
    $search: {
      index: "productSearchIndex",
      compound: {
        should: [
          {
            autocomplete: {
              query: query,
              path: "name",
              fuzzy: { maxEdits: 1 }
            }
          },
          {
            autocomplete: {
              query: query,
              path: "sub_category",
              fuzzy: { maxEdits: 1 }
            }
          }
        ]
      }
    }
  },
  { $limit: 5 }
];




    const results = await collection.aggregate(aggregationPipeline).toArray();
    res.status(200).json({ data: results });
  } catch (err) {
    console.error('❌ Error during search:', err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// =======================================
// ✅ Connect to MongoDB via Mongoose (for Users)
// =======================================

mongoose.connect("mongodb+srv://tanzeeem6:K5wI2A1mGKU3vnZl@cluster0.anb1ekt.mongodb.net/smartcart")
  .then(() => {
    console.log('✅ Mongoose Connected to MongoDB');
    app.listen(3000, () =>
      console.log(`🚀 Server running at http://localhost:3000`)
    );
  })
  .catch(err => console.error('❌ Mongoose connection error:', err));

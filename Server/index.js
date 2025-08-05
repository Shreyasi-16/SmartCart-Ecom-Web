// MONGO + Firebase Auth

const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json'); // downloaded from Firebase console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Token verification middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send('No token provided');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // UID available here
    next();
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
};

// Mongoose schema and model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  userId: String,
}, { collection: 'products' })); // optional: specify collection name

// 🔄 POST route to add a product
app.post('/products', /*authenticate,*/ async (req, res) => {
  const { name, price } = req.body;

  // Use dummy user ID if auth is disabled
  const userId = req.user?.uid || 'test-user';

  const product = new Product({ name, price, userId });
  await product.save();
  res.send('✅ Product saved successfully');
});

// 🆕 GET route to list all products (for testing)
app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

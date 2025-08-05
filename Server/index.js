//MONGO

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

// Define Mongoose schema
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  userId: String,
}));

// Protected route to add product
app.post('/api/products', authenticate, async (req, res) => {
  const { name, price } = req.body;
  const product = new Product({
    name,
    price,
    userId: req.user.uid,
  });

  await product.save();
  res.send('Product saved successfully');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => console.error('MongoDB connection error:', err));

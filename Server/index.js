// Required modules
//MONGO 
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

// Token verification middleware
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
    res.status(401).send('Unauthorized');
  }
};

// MongoDB Product Schema & Model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  price: Number,
  userId: String,
}, { collection: 'products' }));

// ✅ Controller Method: Add Product
const addProduct = async (req, res) => {
  try {
    const { name, price } = req.body;
    const userId = req.user?.uid || 'test-user'; // If auth is disabled

    const product = new Product({ name, price, userId });
    await product.save();

    res.send('✅ Product saved successfully');
  } catch (error) {
    res.status(500).send('❌ Error saving product');
  }
};

// ✅ Controller Method: Get Products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).send('❌ Error retrieving products');
  }
};

// 🔄 Routes using methods
app.post('/products', /* authenticate, */ addProduct);
app.get('/products', getProducts);

// MongoDB connection and server start
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

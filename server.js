const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ecofinds', { useNewUrlParser: true, useUnifiedTopology: true });

// User schema (with bio)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  bio: String
});
const User = mongoose.model('User', userSchema);

// Cart schema
const cartSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: [{ name: String, price: Number, img: String }]
});
const Cart = mongoose.model('Cart', cartSchema);

// Purchase schema
const purchaseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  price: Number,
  img: String,
  date: String
});
const Purchase = mongoose.model('Purchase', purchaseSchema);

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    // Create empty cart for user
    await new Cart({ userId: user._id, items: [] }).save();
    res.json({ success: true, message: 'User registered successfully!' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Email already exists.' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  res.json({ success: true, message: 'Login successful!', userId: user._id });
});

// Get cart
app.get('/api/cart/:userId', async (req, res) => {
  const cart = await Cart.findOne({ userId: req.params.userId });
  res.json(cart ? cart.items : []);
});

// Add to cart
app.post('/api/cart/add', async (req, res) => {
  const { userId, product } = req.body;
  await Cart.updateOne(
    { userId },
    { $push: { items: product } },
    { upsert: true }
  );
  res.json({ success: true });
});

// Remove from cart
app.post('/api/cart/remove', async (req, res) => {
  const { userId, productName } = req.body;
  await Cart.updateOne(
    { userId },
    { $pull: { items: { name: productName } } }
  );
  res.json({ success: true });
});

// Place order (move from cart to purchases)
app.post('/api/purchase', async (req, res) => {
  const { userId, product } = req.body;
  const date = new Date().toISOString();
  // Remove from cart
  await Cart.updateOne(
    { userId },
    { $pull: { items: { name: product.name } } }
  );
  // Add to purchases
  await new Purchase({ userId, ...product, date }).save();
  res.json({ success: true });
});

// Get purchases
app.get('/api/purchases/:userId', async (req, res) => {
  const purchases = await Purchase.find({ userId: req.params.userId }).sort({ date: -1 });
  res.json(purchases);
});

// Get user info
app.get('/api/user/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json(user);
});

// Update user info
app.put('/api/user/:userId', async (req, res) => {
  const { name, email, bio } = req.body;
  await User.findByIdAndUpdate(req.params.userId, { name, email, bio });
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = Number(process.env.PORT) || 3000;
const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
const scrypt = promisify(crypto.scrypt);
const ORDER_STEPS = 4;
const ORDER_STAGE_DELAY_MS = 10_000;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const productSeed = [
  { id: 1, name: 'Wireless Headphones', cat: 'Electronics', price: 3499, stock: 25, rating: 4.6, icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85' },
  { id: 2, name: 'Smart Watch', cat: 'Electronics', price: 3299, stock: 14, rating: 4.4, icon: '⌚', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85' },
  { id: 3, name: 'Bluetooth Speaker', cat: 'Electronics', price: 1599, stock: 30, rating: 4.3, icon: '🔊', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=85' },
  { id: 4, name: 'Cotton T-Shirt', cat: 'Fashion', price: 799, stock: 80, rating: 4.1, icon: '👕', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85' },
  { id: 5, name: 'Running Shoes', cat: 'Sports', price: 3499, stock: 22, rating: 4.7, icon: '👟', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85' },
  { id: 6, name: 'Leather Backpack', cat: 'Fashion', price: 3299, stock: 18, rating: 4.5, icon: '🎒', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85' },
  { id: 7, name: 'Table Lamp', cat: 'Home', price: 899, stock: 40, rating: 4.2, icon: '💡', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=85' },
  { id: 8, name: 'Coffee Maker', cat: 'Home', price: 8999, stock: 9, rating: 4.6, icon: '☕', image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Nespresso_coffee_machine_makes_espresso_in_a_kitchen_setting_on_a_bright_morning_while_other_kitchen_items_are_visible_on_the_countertop.jpg/960px-Nespresso_coffee_machine_makes_espresso_in_a_kitchen_setting_on_a_bright_morning_while_other_kitchen_items_are_visible_on_the_countertop.jpg' },
  { id: 9, name: 'Yoga Mat', cat: 'Sports', price: 799, stock: 55, rating: 4.4, icon: '🧘', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=85' },
  { id: 10, name: 'Sunglasses', cat: 'Fashion', price: 799, stock: 35, rating: 4.0, icon: '🕶️', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=85' },
  { id: 11, name: 'Cricket Bat', cat: 'Sports', price: 1799, stock: 12, rating: 4.5, icon: '🏏', image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Bat_and_helmet_at_Great_Canfield_Cricket_Club%2C_Essex%2C_England.jpg/960px-Bat_and_helmet_at_Great_Canfield_Cricket_Club%2C_Essex%2C_England.jpg' },
  { id: 12, name: 'Desk Organizer', cat: 'Home', price: 699, stock: 60, rating: 4.3, icon: '🗂️', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=85' }
];

let db;
let users;
let sessions;
let products;
let orders;
let counters;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(__dirname));

const route = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function cleanUser(user) {
  return { name: user.name, email: user.email, role: user.role };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(user, res) {
  const token = crypto.randomBytes(32).toString('hex');
  await sessions.insertOne({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
  });
  res.json({ token, user: cleanUser(user) });
}

const authenticate = route(async (req, res, next) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  const session = await sessions.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() }
  });
  if (!session) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  const user = await users.findOne({ _id: session.userId });
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  req.user = user;
  req.tokenHash = hashToken(token);
  next();
});

function requireMerchant(req, res, next) {
  if (req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Merchant access is required.' });
  }
  next();
}

function validEmail(email) {
  return typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);
}

function validImageUrl(url) {
  return !url || (typeof url === 'string' && /^https?:\/\//i.test(url));
}

app.post('/api/auth/register', route(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: 'Enter a valid full name.' });
  }
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!['customer', 'merchant'].includes(role)) {
    return res.status(400).json({ error: 'Choose a valid account type.' });
  }
  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);
  try {
    const result = await users.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      role,
      passwordSalt: salt.toString('hex'),
      passwordHash: passwordHash.toString('hex'),
      createdAt: new Date()
    });
    const user = await users.findOne({ _id: result.insertedId });
    await createSession(user, res);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    throw error;
  }
}));

app.post('/api/auth/login', route(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  const user = await users.findOne({ email });
  if (!user || typeof password !== 'string') {
    return res.status(401).json({ error: 'Email or password is incorrect. Check both and try again.' });
  }
  const expectedHash = Buffer.from(user.passwordHash, 'hex');
  const providedHash = await scrypt(password, Buffer.from(user.passwordSalt, 'hex'), expectedHash.length);
  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    return res.status(401).json({ error: 'Email or password is incorrect. Check both and try again.' });
  }
  await createSession(user, res);
}));

app.get('/api/auth/me', authenticate, (req, res) => res.json(cleanUser(req.user)));
app.post('/api/auth/logout', authenticate, route(async (req, res) => {
  await sessions.deleteOne({ tokenHash: req.tokenHash });
  res.status(204).end();
}));

app.get('/api/products', route(async (_req, res) => {
  res.json(await products.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray());
}));

app.post('/api/products', authenticate, requireMerchant, route(async (req, res) => {
  const { name, cat, price, stock, rating, icon, image } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ error: 'Enter a valid product name.' });
  }
  if (typeof cat !== 'string' || !cat.trim() || cat.length > 50) {
    return res.status(400).json({ error: 'Choose a valid product category.' });
  }
  if (!Number.isFinite(price) || price < 1 || !Number.isInteger(stock) || stock < 0 || !validImageUrl(image)) {
    return res.status(400).json({ error: 'Check the product price, stock, and image URL.' });
  }
  const counter = await counters.findOneAndUpdate(
    { _id: 'products' },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const product = {
    id: counter.value,
    name: name.trim(),
    cat: cat.trim(),
    price,
    stock,
    rating: Number.isFinite(rating) ? rating : 4,
    icon: typeof icon === 'string' ? icon.slice(0, 12) : '🛍️',
    image: image || ''
  };
  await products.insertOne(product);
  res.status(201).json(product);
}));

app.patch('/api/products/:id', authenticate, requireMerchant, route(async (req, res) => {
  const id = Number(req.params.id);
  const updates = {};
  for (const field of ['image', 'price', 'stock']) {
    if (Object.hasOwn(req.body || {}, field)) updates[field] = req.body[field];
  }
  if (!Number.isSafeInteger(id) || !Object.keys(updates).length) {
    return res.status(400).json({ error: 'Invalid product update.' });
  }
  if (Object.hasOwn(updates, 'image') && !validImageUrl(updates.image)) {
    return res.status(400).json({ error: 'Image URL must start with http:// or https://.' });
  }
  if (Object.hasOwn(updates, 'price') && (!Number.isFinite(updates.price) || updates.price < 1)) {
    return res.status(400).json({ error: 'Price must be at least ₹1.' });
  }
  if (Object.hasOwn(updates, 'stock') && (!Number.isInteger(updates.stock) || updates.stock < 0)) {
    return res.status(400).json({ error: 'Stock must be zero or more.' });
  }
  const result = await products.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  if (!result) return res.status(404).json({ error: 'Product not found.' });
  res.json(result);
}));

app.delete('/api/products/:id', authenticate, requireMerchant, route(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid product ID.' });
  const result = await products.deleteOne({ id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Product not found.' });
  res.status(204).end();
}));

async function advanceOrderStatuses() {
  const now = Date.now();
  const activeOrders = await orders.find({ status: { $lt: ORDER_STEPS - 1 } }).toArray();
  for (const order of activeOrders) {
    const updatedAt = Date.parse(order.statusUpdatedAt);
    if (!Number.isFinite(updatedAt)) continue;
    const stages = Math.min(
      ORDER_STEPS - 1 - order.status,
      Math.floor((now - updatedAt) / ORDER_STAGE_DELAY_MS)
    );
    if (stages < 1) continue;
    await orders.updateOne(
      { _id: order._id, status: order.status },
      {
        $set: {
          status: order.status + stages,
          statusUpdatedAt: new Date(updatedAt + stages * ORDER_STAGE_DELAY_MS).toISOString()
        }
      }
    );
  }
}

app.get('/api/orders', authenticate, route(async (req, res) => {
  await advanceOrderStatuses();
  const filter = req.user.role === 'merchant' ? {} : { email: req.user.email };
  res.json(await orders.find(filter, { projection: { _id: 0 } }).sort({ date: -1 }).toArray());
}));

app.post('/api/orders', authenticate, route(async (req, res) => {
  const { customer, address, phone, pay, items } = req.body || {};
  if (typeof customer !== 'string' || !customer.trim() || customer.length > 100 ||
      typeof address !== 'string' || !address.trim() || address.length > 1000) {
    return res.status(400).json({ error: 'Enter a valid name and delivery address.' });
  }
  if (typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Enter a 10-digit phone number.' });
  }
  if (!['card', 'upi', 'cod'].includes(pay)) {
    return res.status(400).json({ error: 'Choose a valid payment method.' });
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    return res.status(400).json({ error: 'Your cart is empty or contains too many items.' });
  }
  const quantities = new Map();
  for (const item of items) {
    if (!Number.isSafeInteger(item.id) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) {
      return res.status(400).json({ error: 'The cart contains an invalid item quantity.' });
    }
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.qty);
  }

  const orderItems = [];
  const adjustedProducts = [];
  try {
    for (const [id, qty] of quantities) {
      const product = await products.findOne({ id });
      if (!product) throw new Error('A product in your cart is no longer available.');
      const stockResult = await products.updateOne({ id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      if (!stockResult.matchedCount) throw new Error(`${product.name} does not have enough stock.`);
      adjustedProducts.push({ id, qty });
      orderItems.push({ id, name: product.name, cat: product.cat, price: product.price, qty });
    }
    const now = new Date().toISOString();
    const order = {
      id: `BS${Date.now().toString().slice(-7)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      email: req.user.email,
      customer: customer.trim(),
      address: address.trim(),
      phone,
      pay,
      items: orderItems,
      total: orderItems.reduce((total, item) => total + item.price * item.qty, 0),
      status: 0,
      date: now,
      statusUpdatedAt: now
    };
    await orders.insertOne(order);
    res.status(201).json(order);
  } catch (error) {
    if (adjustedProducts.length) {
      await products.bulkWrite(adjustedProducts.map(({ id, qty }) => ({
        updateOne: { filter: { id }, update: { $inc: { stock: qty } } }
      })));
    }
    if (error.message.includes('not have enough stock') || error.message.includes('no longer available')) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
}));

app.patch('/api/orders/:id', authenticate, requireMerchant, route(async (req, res) => {
  const status = req.body?.status;
  if (!Number.isInteger(status) || status < 0 || status >= ORDER_STEPS) {
    return res.status(400).json({ error: 'Choose a valid order status.' });
  }
  const result = await orders.findOneAndUpdate(
    { id: req.params.id },
    { $set: { status, statusUpdatedAt: new Date().toISOString() } },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  if (!result) return res.status(404).json({ error: 'Order not found.' });
  res.json(result);
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ error: 'The server could not complete the request. Please try again.' });
});

async function start() {
  await mongoClient.connect();
  db = mongoClient.db(process.env.MONGODB_DB || 'black_sales');
  users = db.collection('users');
  sessions = db.collection('sessions');
  products = db.collection('products');
  orders = db.collection('orders');
  counters = db.collection('counters');
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    products.createIndex({ id: 1 }, { unique: true }),
    orders.createIndex({ id: 1 }, { unique: true }),
    orders.createIndex({ email: 1, date: -1 })
  ]);
  if (await products.estimatedDocumentCount() === 0) {
    await products.insertMany(productSeed);
  }
  const highestProduct = await products.find().sort({ id: -1 }).limit(1).next();
  await counters.updateOne(
    { _id: 'products' },
    { $max: { value: highestProduct?.id || 0 } },
    { upsert: true }
  );
  app.listen(port, () => console.log(`Black Sales is running at http://localhost:${port}`));
}

start().catch(error => {
  console.error('Could not start the server:', error);
  process.exitCode = 1;
});

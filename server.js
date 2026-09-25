// ============================================
// TripGenius AI — Main Server (Final Version)
// ============================================

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS — fixes mongodb+srv lookup issues

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// ===== ALLOWED ORIGINS =====
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  process.env.CLIENT_URL,
  'https://tripx.app',
  'https://www.tripx.app',
].filter(Boolean);

// ===== MIDDLEWARE =====
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any localhost port during development
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow Vercel deployments
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow any origin if CLIENT_URL is *
    if (process.env.CLIENT_URL === '*') return callback(null, true);
    callback(null, true); // Allow all for now — tighten in production
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 30, skip: (req) => !req.path.includes('/ai') }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== DATABASE =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tripgenius')
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// ===== ROUTE IMPORTS =====
const {
  bookingRouter,
  restaurantRouter,
  rideRouter,
  reviewRouter,
  groupRouter,
  destRouter,
  userRouter,
  adminRouter,
} = require('./routes/all-routes');

// ===== ROUTES =====
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/trips',        require('./routes/trips'));
app.use('/api/ai',           require('./routes/ai'));
app.use('/api/bookings',     bookingRouter);
app.use('/api/restaurants',  restaurantRouter);
app.use('/api/rides',        rideRouter);
app.use('/api/reviews',      reviewRouter);
app.use('/api/groups',       groupRouter);
app.use('/api/destinations', destRouter);
app.use('/api/users',        userRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/rooms',        require('./routes/rooms'));

// Health check
app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'TripGenius AI chal raha hai! 🚀',
  mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time: new Date().toISOString()
}));

// ===== API DOCS (simple) =====
app.get('/api', (req, res) => res.json({
  name: 'TripGenius AI API',
  version: '2.0.0',
  endpoints: {
    auth:         ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me', 'POST /api/auth/google', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password'],
    ai:           ['POST /api/ai/generate-trip', 'POST /api/ai/recommend-destinations', 'POST /api/ai/budget-optimize', 'POST /api/ai/crowd-predict'],
    trips:        ['GET /api/trips/my', 'POST /api/trips', 'GET /api/trips/:id', 'DELETE /api/trips/:id'],
    rooms:        ['GET /api/rooms', 'POST /api/rooms', 'GET /api/rooms/:id', 'PUT /api/rooms/:id', 'DELETE /api/rooms/:id'],
    bookings:     ['POST /api/bookings', 'GET /api/bookings/my', 'PATCH /api/bookings/:id/status', 'POST /api/bookings/:id/confirm-payment'],
    restaurants:  ['GET /api/restaurants', 'POST /api/restaurants', 'GET /api/restaurants/:id'],
    rides:        ['GET /api/rides', 'POST /api/rides', 'PATCH /api/rides/:id/availability'],
    reviews:      ['POST /api/reviews', 'GET /api/reviews/:type/:targetId'],
    groups:       ['POST /api/groups', 'GET /api/groups/my', 'GET /api/groups/:id', 'POST /api/groups/:id/expense'],
    destinations: ['GET /api/destinations', 'GET /api/destinations/:id'],
    users:        ['GET /api/users/profile', 'POST /api/users/wishlist/:destId'],
    admin:        ['GET /api/admin/stats', 'GET /api/admin/users', 'GET /api/admin/rooms/pending'],
  }
}));

// Error handler
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 TripGenius server: http://localhost:${PORT}`);
  console.log(`📖 API docs: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;

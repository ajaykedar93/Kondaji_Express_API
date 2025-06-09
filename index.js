// index.js (or app.js) - Backend entry point

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// PostgreSQL pool (assuming you have a db.js for that)
const pool = require('./db'); // adjust if needed

// Middleware setup
app.use(cors());
app.use(express.json()); // parse JSON payloads

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple request logger
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.url}`);
  next();
});

// Import your routes
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/imageRoutes');
const orderRoutes = require('./routes/orderRoutes');

const adminUserRoutes = require('./routes/adminUserRoutes');
const settingsRoute = require('./routes/siteSettingsRoutes');
const productRoutes = require('./routes/productRoutes');
const addProductRouter = require('./routes/AddProduct');  // handle product-related routes
const adminSummaryRoute = require('./routes/adminSummaryRoute');
const userRoutes = require('./routes/userRoutes');
const couponRoutes = require('./routes/coupons');
const categoryRoutes = require('./routes/categoryRoutes');
const superadminRouter = require('./routes/superadminRoute');
const manageAdminRouter = require('./routes/ManageAdmin');
const analyticsRoutes = require('./routes/analyticsRoutes');
const cartWishlistAddressRoutes = require('./routes/cartwishlistaddress');
const usersupportRoutes = require('./routes/usersupport');



// Register your API routes with prefixes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/products', productRoutes); // General products route
app.use('/api/products/add', addProductRouter); // Specific route for adding products
app.use('/api/orders', orderRoutes);

app.use('/api/settings', settingsRoute);
app.use('/api/admin/summary', adminSummaryRoute);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/user', userRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/superadmin', superadminRouter);
app.use('/api/admin', manageAdminRouter);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/userdata', cartWishlistAddressRoutes);
app.use('/api/messages', usersupportRoutes);



// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ msg: '404 - API Route Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ msg: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

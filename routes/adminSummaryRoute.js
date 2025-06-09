const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/admin/summary
router.get('/', async (req, res) => {
  try {
    const [users, products, orders] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM products'),
      pool.query('SELECT status, total FROM orders'),
    ]);

    const totalUsers = parseInt(users.rows[0].count);
    const totalProducts = parseInt(products.rows[0].count);

    let totalOrders = 0;
    let delivered = 0;
    let cancelled = 0;
    let returned = 0;
    let revenue = 0;

    orders.rows.forEach((order) => {
      totalOrders++;
      const status = order.status;
      const total = parseFloat(order.total) || 0;

      if (status === 'Delivered') {
        delivered++;
        revenue += total;
      } else if (status === 'Cancelled') {
        cancelled++;
      } else if (status === 'Returned') {
        returned++;
      }
    });

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      delivered,
      cancelled,
      returned,
      revenue,
    });
  } catch (error) {
    console.error('❌ Error in /admin/summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

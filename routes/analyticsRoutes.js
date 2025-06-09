const express = require('express');
const router = express.Router();
const pool = require('../db'); // your PostgreSQL connection pool

// GET: /api/analytics/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // 1. Total Users (role = 'user')
    const totalUsersQuery = 'SELECT COUNT(*) FROM users WHERE role = $1';
    const totalUsersResult = await pool.query(totalUsersQuery, ['user']);

    // 2. Total Sales (count of paid orders)
    const totalSalesQuery = 'SELECT COUNT(*) FROM orders WHERE payment_status = $1';
    const totalSalesResult = await pool.query(totalSalesQuery, ['Paid']);

    // 3. Total Revenue (sum of totals of paid orders)
    const totalRevenueQuery = 'SELECT COALESCE(SUM(total), 0) AS sum FROM orders WHERE payment_status = $1';
    const totalRevenueResult = await pool.query(totalRevenueQuery, ['Paid']);

    // 4. Active Users (distinct users ordered in last 30 days)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) AS count_active
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;
    const activeUsersResult = await pool.query(activeUsersQuery);

    // 5. Top Products (by quantity sold in paid orders)
    const topProductsQuery = `
      SELECT
        p.name,
        SUM((i->>'qty')::INTEGER) AS total_qty
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(o.items) AS i
      JOIN products p ON (i->>'id')::INTEGER = p.id
      WHERE o.payment_status = 'Paid'
      GROUP BY p.name
      ORDER BY total_qty DESC
      LIMIT 5
    `;
    const topProductsResult = await pool.query(topProductsQuery);

    // Construct and send response
    res.json({
      total_users: parseInt(totalUsersResult.rows[0].count, 10),
      total_sales: parseInt(totalSalesResult.rows[0].count, 10),
      total_revenue: parseFloat(totalRevenueResult.rows[0].sum),
      active_users: parseInt(activeUsersResult.rows[0].count_active, 10),
      top_products: topProductsResult.rows.map((p) => ({
        name: p.name,
        quantity_sold: parseInt(p.total_qty, 10),
      })),
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

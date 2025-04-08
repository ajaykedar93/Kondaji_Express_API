const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your DB connection

router.post('/order', async (req, res) => {
  const { user_id, product_id, quantity, total_price, status = 'confirmed' } = req.body;

  try {
    const newOrder = await pool.query(
      `INSERT INTO orders (user_id, product_id, quantity, total_price, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, product_id, quantity, total_price, status]
    );

    res.status(201).json({ message: "Order saved", order: newOrder.rows[0] });
  } catch (err) {
    console.error("Order save error:", err);
    res.status(500).json({ message: "Failed to save order" });
  }
});

module.exports = router;

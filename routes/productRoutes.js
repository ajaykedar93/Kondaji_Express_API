const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all products
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

module.exports = router;

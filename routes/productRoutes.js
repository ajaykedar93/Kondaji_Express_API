const express = require('express');
const router = express.Router();
const pool = require('../db'); // DB connection file

// GET /api/product/:id - fetch product info
router.get('/product/:id', async (req, res) => {
  const productId = parseInt(req.params.id);

  if (isNaN(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const result = await pool.query(
      'SELECT name, image, price FROM product WHERE id = $1',
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

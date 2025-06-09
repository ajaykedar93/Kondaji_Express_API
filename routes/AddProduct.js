const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your PostgreSQL Pool instance
const upload = require('../middleware/multer'); // Multer configured with Cloudinary storage

// POST /api/products/bulk-add
// Expects:

router.post('/bulk-add', upload.array('images'), async (req, res) => {
  try {
    if (!req.body.products) {
      return res.status(400).json({ message: 'Products JSON field is required' });
    }

    const products = JSON.parse(req.body.products);
    const files = req.files;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products array is required and cannot be empty.' });
    }

    if (!files || files.length !== products.length) {
      return res.status(400).json({ message: 'Number of images must match number of products.' });
    }

    // Prepare insert data with uploaded Cloudinary URLs
    const values = [];
    const placeholders = products.map((p, i) => {
      const baseIndex = i * 10;
      values.push(
        p.name,
        p.price,
        files[i].path,              // Cloudinary image URL from multer-storage-cloudinary
        p.description || null,
        p.discount !== undefined ? p.discount : 0,
        p.offer || null,
        p.is_sale !== undefined ? p.is_sale : false,
        p.in_stock !== undefined ? p.in_stock : true,
        p.stock_quantity !== undefined ? p.stock_quantity : 0,
        p.category_id || null
      );
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`;
    }).join(', ');

    const query = `
      INSERT INTO products
        (name, price, image, description, discount, offer, is_sale, in_stock, stock_quantity, category_id)
      VALUES
        ${placeholders}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Products added successfully',
      products: result.rows,
    });
  } catch (error) {
    console.error('Bulk add with Cloudinary upload error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

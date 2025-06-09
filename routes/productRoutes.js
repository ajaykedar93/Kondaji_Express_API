const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to check if product exists by ID
async function productExists(id) {
  const res = await db.query('SELECT 1 FROM products WHERE id = $1', [id]);
  return res.rowCount > 0;
}

// GET all products
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE new product
router.post('/', async (req, res) => {
  const {
    name,
    price,
    image,
    description,
    discount = 0,
    offer = null,
    is_sale = false,
    in_stock = true,
    stock_quantity = 0,
    category_id = null
  } = req.body;

  if (!name || price == null || !image) {
    return res.status(400).json({ error: 'Name, price and image are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO products 
       (name, price, image, description, discount, offer, is_sale, in_stock, stock_quantity, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, price, image, description, discount, offer, is_sale, in_stock, stock_quantity, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE product by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // Define numeric fields expected to be integers or null
  const intFields = ['discount', 'stock_quantity', 'category_id'];

  // Sanitize input: convert "" to null for integer fields
  intFields.forEach((field) => {
    if (field in updates) {
      if (updates[field] === '' || updates[field] === null) {
        updates[field] = null;
      } else {
        // Optional: parse to int (you can also validate if numeric)
        updates[field] = Number(updates[field]);
        if (isNaN(updates[field])) updates[field] = null;
      }
    }
  });

  try {
    if (!(await productExists(id))) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      fields.push(`${key} = $${idx++}`);
      values.push(updates[key]);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// DELETE product by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await productExists(id))) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// TOGGLE is_sale status
router.put('/:id/toggle-sale', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await productExists(id))) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await db.query('SELECT is_sale FROM products WHERE id = $1', [id]);
    const newStatus = !product.rows[0].is_sale;

    const result = await db.query(
      'UPDATE products SET is_sale = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling sale status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TOGGLE in_stock status
router.put('/:id/toggle-stock', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await productExists(id))) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await db.query('SELECT in_stock FROM products WHERE id = $1', [id]);
    const newStatus = !product.rows[0].in_stock;

    const result = await db.query(
      'UPDATE products SET in_stock = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling stock status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/low-stock', async (req, res) => {
  try {
    const query = `
      SELECT id, name, stock_quantity
      FROM products
      WHERE stock_quantity < 5 AND in_stock = true
      ORDER BY stock_quantity ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/products/stock-status
router.get('/stock-status', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        name, 
        stock_quantity,
        in_stock,
        CASE 
          WHEN stock_quantity < 5 AND in_stock = true THEN 'low'
          ELSE 'normal'
        END AS alert
      FROM products
      ORDER BY stock_quantity ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
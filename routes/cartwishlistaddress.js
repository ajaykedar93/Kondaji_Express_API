const express = require('express');
const router = express.Router();
const db = require('../db'); // your PostgreSQL pool connection

// ===================== CART ===================== //

// Overwrite entire cart
router.post('/cart/save', async (req, res) => {
  const { userId, cartItems } = req.body;
  try {
    await db.query('BEGIN');

    // Delete existing cart
    await db.query('DELETE FROM user_cart WHERE user_id = $1', [userId]);

    // Insert all cart items
    for (const item of cartItems) {
      await db.query(
        'INSERT INTO user_cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [userId, item.id, item.quantity]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Cart saved successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Cart Save Error:', err);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Add single item to cart (if exists, increase quantity by 1)
router.post('/cart/add', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    // Check if item exists
    const result = await db.query(
      'SELECT quantity FROM user_cart WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (result.rows.length > 0) {
      // Update quantity +1
      await db.query(
        'UPDATE user_cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
    } else {
      // Insert new item with quantity 1
      await db.query(
        'INSERT INTO user_cart (user_id, product_id, quantity) VALUES ($1, $2, 1)',
        [userId, productId]
      );
    }

    res.json({ message: 'Cart item added' });
  } catch (err) {
    console.error('Cart Add Error:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Remove single item from cart
router.post('/cart/remove', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    await db.query(
      'DELETE FROM user_cart WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    res.json({ message: 'Cart item removed' });
  } catch (err) {
    console.error('Cart Remove Error:', err);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Get user's cart with product details
router.get('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.image
       FROM user_cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Cart Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ===================== WISHLIST ===================== //

// Get user's wishlist
router.get('/wishlist/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query(
      `SELECT w.product_id AS id, p.name, p.price, p.image, w.created_at
       FROM user_wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Wishlist Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add single item to wishlist
router.post('/wishlist/add', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    // Check if already wishlisted
    const exists = await db.query(
      'SELECT 1 FROM user_wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    await db.query(
      'INSERT INTO user_wishlist (user_id, product_id) VALUES ($1, $2)',
      [userId, productId]
    );
    res.json({ message: 'Wishlist item added' });
  } catch (err) {
    console.error('Wishlist Add Error:', err);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove single item from wishlist
router.post('/wishlist/remove', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const result = await db.query(
      'DELETE FROM user_wishlist WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.json({ message: 'Wishlist item removed' });
  } catch (err) {
    console.error('Wishlist Remove Error:', err);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Overwrite entire wishlist (save all)
router.post('/wishlist/save', async (req, res) => {
  const { userId, wishlist } = req.body;
  try {
    await db.query('BEGIN');

    await db.query('DELETE FROM user_wishlist WHERE user_id = $1', [userId]);

    for (const item of wishlist) {
      await db.query(
        'INSERT INTO user_wishlist (user_id, product_id) VALUES ($1, $2)',
        [userId, item.id]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Wishlist saved successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Wishlist Save Error:', err);
    res.status(500).json({ error: 'Failed to save wishlist' });
  }
});


// ===================== ADDRESS ===================== //

// Save or update user address (only one per user)
router.post('/address/save', async (req, res) => {
  const { userId, name, phone, street, city, state, pincode } = req.body;
  try {
    const existing = await db.query('SELECT id FROM user_address WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      // Update existing
      await db.query(
        `UPDATE user_address SET name=$1, phone=$2, street=$3, city=$4, state=$5, pincode=$6 WHERE user_id=$7`,
        [name, phone, street, city, state, pincode, userId]
      );
    } else {
      // Insert new
      await db.query(
        `INSERT INTO user_address (user_id, name, phone, street, city, state, pincode)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, name, phone, street, city, state, pincode]
      );
    }
    res.json({ message: 'Address saved successfully' });
  } catch (err) {
    console.error('Address Save Error:', err);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// Get address for user
router.get('/address/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query('SELECT * FROM user_address WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Address Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// POST /api/userdata/address/delete
router.post('/address/delete', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  try {
    await db.query('DELETE FROM user_address WHERE user_id = $1', [userId]);
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Address Delete Error:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});


module.exports = router;

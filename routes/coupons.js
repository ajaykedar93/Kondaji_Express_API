const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL pool connection

// ✅ Validate and mark a coupon as used ONCE only
router.post('/validate', async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  const trimmedCode = code.trim().toUpperCase();

  try {
    // Step 1: Select valid + unused + unexpired coupon
    const result = await pool.query(
      `SELECT * FROM coupons 
       WHERE UPPER(code) = $1 
         AND used = FALSE 
         AND expiry >= CURRENT_DATE`,
      [trimmedCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Invalid, expired, or already used coupon' });
    }

    const coupon = result.rows[0];

    // Step 2: Update only if not used yet
    const updateResult = await pool.query(
      `UPDATE coupons SET used = TRUE WHERE id = $1 AND used = FALSE`,
      [coupon.id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(409).json({ error: 'Coupon was already marked as used' });
    }

    // Step 3: Respond
    res.json({
      message: '✅ Coupon is valid',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount: coupon.discount,
        expiry: coupon.expiry
      }
    });
  } catch (err) {
    console.error('❌ Coupon validation error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ✅ GET all coupons
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching coupons:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ POST a new coupon (admin)
router.post('/admin', async (req, res) => {
  const { code, discount, expiry } = req.body;
  console.log("➡️ Received New Coupon:", { code, discount, expiry });

  // Basic input validation
  if (!code || !discount || !expiry) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const parsedDiscount = parseInt(discount);
  const parsedExpiry = new Date(expiry);

  if (isNaN(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
    return res.status(400).json({ error: 'Discount must be a number between 1 and 100' });
  }

  if (isNaN(parsedExpiry.getTime())) {
    return res.status(400).json({ error: 'Invalid expiry date format' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO coupons (code, discount, expiry) VALUES ($1, $2, $3) RETURNING *',
      [code.trim().toUpperCase(), parsedDiscount, parsedExpiry]
    );
    console.log("✅ Coupon added:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error inserting coupon:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Coupon code already exists' });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// ✅ DELETE coupon by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid coupon ID' });
  }

  try {
    const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    console.log("🗑️ Coupon deleted:", result.rows[0]);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting coupon:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

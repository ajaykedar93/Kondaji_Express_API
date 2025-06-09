const express = require('express');
const router = express.Router();
const pool = require('../db'); // assumes db.js contains your PostgreSQL Pool config

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, password, phone, address]
    );

    res.status(201).json({
      message: "User registered successfully!",
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ✅ GET all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, city, state, postal_code, country, profile_image, role FROM users'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch users error:', err.message);
    res.status(500).json({ msg: 'Failed to fetch users' });
  }
});

// ✅ DELETE user by ID
router.delete('/delete-user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ msg: '✅ User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ msg: 'Failed to delete user' });
  }
});

module.exports = router;

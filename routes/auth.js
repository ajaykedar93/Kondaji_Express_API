// Filename: routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// ==============================
// Register Route (Handles user, admin, superadmin)
// ==============================
router.post('/register', async (req, res) => {
  const {
    role,
    name,
    email,
    username,
    password,
    phone,
    address,
    city,
    state,
    postal_code,
    country
  } = req.body;

  try {
    if (!name || !password || (!email && role === 'user') || (!username && role !== 'user')) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle Admin or Superadmin
    if (role === 'admin' || role === 'superadmin') {
      const superadminExists = await pool.query('SELECT * FROM admins WHERE role = $1', ['superadmin']);

      if (role === 'superadmin' && superadminExists.rows.length > 0) {
        return res.status(403).json({ message: 'Superadmin already registered' });
      }

      await pool.query(
        `INSERT INTO admins (name, username, password, phone, email, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, username, hashedPassword, phone || '', email || '', role]
      );

      return res.status(201).json({ message: `${role} registered successfully` });
    }

    // Handle User Registration
    if (role === 'user') {
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      await pool.query(
        `INSERT INTO users (name, email, password, phone, address, city, state, postal_code, country, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          name,
          email,
          hashedPassword,
          phone || '',
          address || '',
          city || '',
          state || '',
          postal_code || '',
          country || '',
          'user'
        ]
      );

      return res.status(201).json({ message: 'User registered successfully' });
    }

    return res.status(400).json({ message: 'Invalid role' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ==============================
// Admin Login (Admin or Superadmin)
// ==============================
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Admin not found' });

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, admin });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Login error' });
  }
});

// ✅ Check if superadmin already exists
router.get('/admin-exists', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT 1 FROM admins WHERE role = $1 LIMIT 1',
      ['superadmin']
    );

    if (result.rows.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('Error checking superadmin:', err);
    return res.status(500).json({ message: 'Server error checking superadmin' });
  }
});


// ==============================
// User Login
// ==============================
router.post('/user-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token, user });
  } catch (err) {
    console.error('User Login Error:', err);
    res.status(500).json({ message: 'Login error' });
  }
});

// ==============================
// Superadmin Adds New Admin
// ==============================
router.post('/add-admin', async (req, res) => {
  const { name, username, password, phone, email } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM admins WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Admin with this username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO admins (name, username, password, phone, email, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, username, hashedPassword, phone || '', email || '', 'admin']
    );

    res.status(201).json({ message: 'New admin added successfully' });
  } catch (err) {
    console.error('Add Admin Error:', err);
    res.status(500).json({ message: 'Failed to add admin' });
  }
});


// POST /api/auth/add-admin
router.post('/add-admin', async (req, res) => {
  const { name, username, password, phone, email } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM admins WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Admin with this username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO admins (name, username, password, phone, email, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')`,
      [name, username, hashedPassword, phone || '', email || '']
    );

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error('Add Admin Error:', err);
    res.status(500).json({ message: 'Failed to register admin' });
  }
});

// GET /api/auth/admins
router.get('/admins', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, username, email, phone, role, created_at FROM admins WHERE role = 'admin' ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch Admins Error:', err);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
});

// PUT /api/auth/update-admin/:id
router.put('/update-admin/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE admins SET name = $1, phone = $2, email = $3 WHERE id = $4 RETURNING *`,
      [name, phone, email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ message: 'Admin updated successfully', admin: result.rows[0] });
  } catch (err) {
    console.error('Update Admin Error:', err);
    res.status(500).json({ message: 'Failed to update admin' });
  }
});

// DELETE /api/auth/delete-admin/:id
router.delete('/delete-admin/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM admins WHERE id = $1 AND role = $2', [id, 'admin']);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Admin not found or cannot delete superadmin' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Delete Admin Error:', err);
    res.status(500).json({ message: 'Failed to delete admin' });
  }
});




module.exports = router;
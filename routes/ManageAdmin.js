const express = require('express');
const router = express.Router();
const db = require('../db'); // Your PostgreSQL DB connection module

// Helper: Check if admin exists by ID
async function adminExists(id) {
  const res = await db.query('SELECT 1 FROM admins WHERE id = $1', [id]);
  return res.rowCount > 0;
}

// Helper: Get admin by ID
async function getAdminById(id) {
  const res = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
  return res.rows[0];
}

// GET all admins (optional filter by status)
router.get('/admins', async (req, res) => {
  try {
    const { status } = req.query; // optional filter
    let query = 'SELECT id, name, username, email, phone, role, image, created_at, updated_at, status, last_login FROM admins';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch admins error:', err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// GET single admin by ID
router.get('/admins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT id, name, username, email, phone, role, image, created_at, updated_at, status, last_login FROM admins WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch admin error:', err);
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
});

// CREATE new admin
router.post('/admins', async (req, res) => {
  const {
    name,
    username,
    password, // TODO: Hash password before storing
    phone,
    email,
    role = 'admin',
    image = null,
    status = 'active'
  } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO admins (name, username, password, phone, email, role, image, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, username, email, phone, role, image, created_at, updated_at, status`,
      [name, username, password, phone, email, role, image, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// UPDATE admin (any fields)
router.put('/admins/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (!(await adminExists(id))) {
      return res.status(404).json({ error: 'Admin not found' });
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
    const query = `UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, username, email, phone, role, image, created_at, updated_at, status, last_login`;
    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update admin error:', err);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// DELETE admin by ID
router.delete('/admins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await adminExists(id))) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    await db.query('DELETE FROM admins WHERE id = $1', [id]);
    res.json({ msg: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// UPDATE last_login timestamp (e.g., on login)
// Added check for suspended status: refuse login if suspended
router.put('/admins/:id/last-login', async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await getAdminById(id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    if (admin.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Login denied.' });
    }

    const result = await db.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1 RETURNING id, last_login',
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update last_login error:', err);
    res.status(500).json({ error: 'Failed to update last login' });
  }
});

// UPDATE last_logout timestamp (new endpoint)
router.put('/admins/:id/last-logout', async (req, res) => {
  const { id } = req.params;

  try {
    if (!(await adminExists(id))) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    const result = await db.query(
      'UPDATE admins SET last_logout = NOW() WHERE id = $1 RETURNING id, last_logout',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update last_logout error:', err);
    res.status(500).json({ error: 'Failed to update last logout' });
  }
});

// UPDATE status (active/suspended)
router.put('/admins/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await db.query(
      'UPDATE admins SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;

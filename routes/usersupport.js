const express = require('express');
const router = express.Router();
const db = require('../db'); // Your PostgreSQL pool connection

// ==================== User submits feedback or support request ====================
router.post('/submit', async (req, res) => {
  const { name, email, message, type } = req.body;

  if (!name || !email || !message || !type || !['feedback', 'support'].includes(type)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const result = await db.query(
      `INSERT INTO user_messages (name, email, message, type) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, email, message, type]
    );
    res.json({ message: 'Message submitted successfully', messageId: result.rows[0].id });
  } catch (err) {
    console.error('Submit Message Error:', err);
    res.status(500).json({ error: 'Failed to submit message' });
  }
});

// ==================== Admin fetches all messages ====================
router.get('/admin/all', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, message, type, status, response, created_at 
       FROM user_messages ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch All Messages Error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ==================== Admin responds to a message ====================
router.post('/admin/respond', async (req, res) => {
  const { messageId, response, status } = req.body;

  if (!messageId || typeof response !== 'string') {
    return res.status(400).json({ error: 'Invalid input data: messageId and response are required' });
  }

  const allowedStatuses = ['pending', 'responded', 'resolved', 'closed'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status value. Allowed: ${allowedStatuses.join(', ')}` });
  }

  try {
    const result = await db.query(
      `UPDATE user_messages 
       SET response = $1, status = COALESCE($2, status) 
       WHERE id = $3 
       RETURNING *`,
      [response, status || null, messageId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Response saved successfully', updatedMessage: result.rows[0] });
  } catch (err) {
    console.error('Respond to Message Error:', err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// ==================== User fetches their own messages by email ====================
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;

  // Validate email format
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const checkUserMessages = await db.query(
      `SELECT id, name, email, message, type, status, response, created_at
       FROM user_messages WHERE email = $1 ORDER BY created_at DESC`,
      [email]
    );

    if (checkUserMessages.rowCount === 0) {
      return res.status(404).json({ error: 'No messages found for this email' });
    }

    res.json(checkUserMessages.rows);
  } catch (err) {
    console.error('Fetch User Messages Error:', err);
    res.status(500).json({ error: 'Failed to fetch user messages' });
  }
});

// DELETE user message by ID (Admin only)
router.delete('/admin/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existsRes = await db.query('SELECT 1 FROM user_messages WHERE id = $1', [id]);
    if (existsRes.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await db.query('DELETE FROM user_messages WHERE id = $1', [id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ==================== Fetch Responses (Feedback and Support combined) ====================
router.get('/response', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM user_messages WHERE type IN ($1, $2)', ['feedback', 'support']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// ==================== Delete user response by ID (Admin only) ====================
router.delete('/admin/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if message exists
    const existsRes = await db.query('SELECT 1 FROM user_messages WHERE id = $1', [id]);
    if (existsRes.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Delete the message
    await db.query('DELETE FROM user_messages WHERE id = $1', [id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ==================== Check if user email exists ====================
router.get('/users/check-email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const result = await db.query(
      `SELECT 1 FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const exists = result.rowCount > 0;
    res.json({ exists });
  } catch (err) {
    console.error('Email Check Error:', err);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

module.exports = router;

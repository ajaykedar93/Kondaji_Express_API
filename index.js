const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Server error');
  }
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

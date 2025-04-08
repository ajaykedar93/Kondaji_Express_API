const express = require('express');
const cors = require('cors');
const pool = require('./db');

const imageRoutes = require('./routes/imageRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express(); // ✅ this was missing in your code above

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', imageRoutes);
app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', paymentRoutes);
app.use('/api', orderRoutes);
app.use('/api', notificationRoutes);

require('dotenv').config();

// GET all products
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});



// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).send('Server error');
  }
});

// Register user
app.post('/api/users/register', async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, password, phone, address]
    );

    res.status(201).json({ message: "User registered successfully!", user: newUser.rows[0] });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});



// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

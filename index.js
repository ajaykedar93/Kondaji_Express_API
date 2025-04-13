require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const imageRoutes = require('./routes/imageRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const usersRegisterRoute = require('./routes/usersregister');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const bodyParser = require("body-parser");

const app = express(); // ✅ this was missing in your code above

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


// Routes
app.use('/api', imageRoutes);
app.use('/api', userRoutes);
app.use('/', productRoutes);
app.use('/api/users', usersRegisterRoute);
app.use('/api', orderRoutes);
app.use('/api', notificationRoutes);


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




// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

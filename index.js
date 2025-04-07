const express = require('express');
const cors = require('cors');
const pool = require('./db');
const cartRoutes = require("./routes/cart");
const authRoutes = require("./routes/auth"); // optional if auth.js exists
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/cart", cartRoutes);
app.use("/api/auth", authRoutes); // optional route

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
<<<<<<< HEAD

=======

// Register User API
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
>>>>>>> 0b89590 (Add user registration API)




// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

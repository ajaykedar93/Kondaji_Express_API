const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register user
router.post("/register", async (req, res) => {
  const { full_name, email, password, mobile, address, dob } = req.body;

  try {
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (full_name, email, password, mobile, address, dob)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [full_name, email, hashedPassword, mobile, address, dob]
    );

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token (optional)
    const token = jwt.sign({ userId: user.id }, "secret_key", { expiresIn: "1h" });

    res.json({ message: "Login successful", userId: user.id, token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;

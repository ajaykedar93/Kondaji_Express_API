const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const upload = require('../middleware/multer');
require('dotenv').config();
const cloudinary = require('../utils/cloudinary'); // optional if you're using Cloudinary
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET;
global.otpMap = global.otpMap || {};

// ✅ Email transporter (Yahoo SMTP)
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ 1. User Login
router.post('/user-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    const { password: _, ...userData } = user;
    res.json({ message: 'User login successful', token, user: userData });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email is required to send OTP' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    global.otpMap = global.otpMap || {};
    global.otpMap[email] = otp;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // ✅ Must be a valid email string
      subject: 'Your OTP for Password Reset',
      html: `<p>Your OTP is: <strong>${otp}</strong></p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent to ${email} → ${info.messageId}`);

    res.json({ msg: '✅ OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ msg: '❌ Failed to send OTP' });
  }
});


// ✅ 3. Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (global.otpMap[email] && global.otpMap[email] == otp) {
    delete global.otpMap[email];
    return res.json({ verified: true });
  }
  res.status(400).json({ msg: 'Invalid OTP' });
});

// ✅ 4. Check if user email exists
router.post('/check-user-email', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('Email check error:', err.message);
    res.status(500).json({ msg: 'Email check failed' });
  }
});

// ✅ 5. Reset password
router.put('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, name, email, role',
      [hashedPassword, email]
    );
    if (result.rows.length === 0) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: '✅ Password reset successful' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ msg: 'Failed to reset password' });
  }
});

// ✅ 6. Change email after OTP
router.put('/change-email/:id', async (req, res) => {
  const { id } = req.params;
  const { newEmail } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, name, email, phone, address, role',
      [newEmail, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Email update error:', err.message);
    res.status(500).json({ msg: 'Failed to update email' });
  }
});

// ✅ 7. Update profile (excluding email/password)
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, city, state, postal_code, country } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET name = $1, phone = $2, address = $3, city = $4, state = $5, postal_code = $6, country = $7
       WHERE id = $8
       RETURNING id, name, email, phone, address, city, state, postal_code, country, profile_image, role`,
      [name, phone, address, city, state, postal_code, country, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ msg: 'Profile update failed' });
  }
});

// ✅ 8. Get profile by ID
router.get('/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, city, state, postal_code, country, profile_image, role FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ msg: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch profile error:', err.message);
    res.status(500).json({ msg: 'Failed to fetch profile' });
  }
});

// ✅ 9. Upload profile image
router.post('/upload-image/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const imageUrl = req.file.path;

    const result = await pool.query(
      'UPDATE users SET profile_image = $1 WHERE id = $2 RETURNING id, name, profile_image',
      [imageUrl, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ msg: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Image upload error:', err.message);
    res.status(500).json({ msg: 'Image upload failed' });
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

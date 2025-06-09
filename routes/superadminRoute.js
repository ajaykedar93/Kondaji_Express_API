require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const pool = require('../db'); // Your pg Pool instance
const cloudinary = require('../utils/cloudinary');
const upload = require('../middleware/multer');


// In-memory OTP store: { key: userId_email, value: { code, expires } }
const otpStore = new Map();

// Nodemailer transporter setup (example: Yahoo SMTP)
const transporter = nodemailer.createTransport({
  service: 'Yahoo',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send OTP email
async function sendOtpEmail(toEmail, otpCode) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your OTP Code for Email Verification',
    text: `Your OTP code is: ${otpCode}. It will expire in 5 minutes.`,
  };
  await transporter.sendMail(mailOptions);
}

// --- Routes ---

// GET all superadmins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, phone, role, image, created_at
       FROM admins
       WHERE role = 'superadmin'
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching superadmins:', err);
    res.status(500).json({ message: 'Failed to fetch superadmins' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admins WHERE role = 'superadmin' ORDER BY created_at DESC");
    res.json(result.rows); // returns only superadmins
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error fetching superadmins' });
  }
});


// POST create new superadmin (use carefully)
router.post('/', async (req, res) => {
  const { name, username, password, phone, email, image } = req.body;

  try {
    const existingSuperadmin = await pool.query(`SELECT * FROM admins WHERE role = 'superadmin'`);
    if (existingSuperadmin.rows.length > 0) {
      return res.status(403).json({ message: 'Superadmin already exists' });
    }

    const existingUser = await pool.query(
      `SELECT * FROM admins WHERE username = $1 OR email = $2`,
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `INSERT INTO admins (name, username, password, phone, email, image, role) 
       VALUES ($1, $2, $3, $4, $5, $6, 'superadmin') RETURNING *`,
      [name, username, hashedPassword, phone || '', email || '', image || null]
    );

    res.status(201).json({ message: 'Superadmin created successfully', superadmin: insertResult.rows[0] });
  } catch (err) {
    console.error('Error creating superadmin:', err);
    res.status(500).json({ message: 'Failed to create superadmin' });
  }
});

// PUT update superadmin by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, username, email, phone, image, password } = req.body;

  try {
    if (username || email) {
      const existingUser = await pool.query(
        `SELECT id FROM admins WHERE (username = $1 OR email = $2) AND id <> $3`,
        [username, email, id]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Username or email already in use by another user.' });
      }
    }

    let hashedPassword = null;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(username);
    }
    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (image !== undefined) {
      fields.push(`image = $${idx++}`);
      values.push(image);
    }
    if (hashedPassword !== null) {
      fields.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    values.push(id);

    const query = `UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx} AND role = 'superadmin' RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Superadmin not found' });
    }

    res.json({ message: 'Superadmin updated successfully', superadmin: result.rows[0] });
  } catch (err) {
    console.error('Error updating superadmin:', err);
    res.status(500).json({ message: 'Failed to update superadmin' });
  }
});

// DELETE /api/superadmin/:id - delete superadmin by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete superadmin by id and role = 'superadmin'
    const result = await pool.query(
      `DELETE FROM admins WHERE id = $1 AND role = 'superadmin'`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Superadmin not found' });
    }

    res.json({ message: 'Superadmin deleted successfully' });
  } catch (err) {
    console.error('Error deleting superadmin:', err);
    res.status(500).json({ message: 'Failed to delete superadmin' });
  }
});


// Upload single image and send to Cloudinary
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file uploaded' });

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'uploads' }, // Optional folder on Cloudinary
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await streamUpload();

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ message: 'Image upload failed' });
  }
});



// POST verify-password
router.post('/verify-password', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'userId and password are required' });
  }

  try {
    const query = `
      SELECT id, password, role
      FROM admins
      WHERE id = $1 AND role IN ('admin', 'superadmin')
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('verify-password error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST send-otp
router.post('/send-otp', async (req, res) => {
  const { userId, email } = req.body;

  if (!userId || !email) return res.status(400).json({ message: 'userId and email are required' });

  try {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in memory with expiration
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    const key = `${userId}_${email}`;
    otpStore.set(key, { code: otpCode, expires });

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code for Email Verification',
      text: `Your OTP code is: ${otpCode}. It expires in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST verify-otp
router.post('/verify-otp', (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return res.status(400).json({ success: false, message: 'userId and otp are required' });

  // Find OTP by userId_email key
  let foundEntry = null;
  for (const [key, val] of otpStore.entries()) {
    if (key.startsWith(`${userId}_`) && val.code === otp) {
      foundEntry = { key, val };
      break;
    }
  }

  if (!foundEntry) return res.status(400).json({ success: false, message: 'OTP not found or incorrect' });

  if (Date.now() > foundEntry.val.expires) {
    otpStore.delete(foundEntry.key);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  // OTP valid - delete and respond success
  otpStore.delete(foundEntry.key);
  res.json({ success: true });
});



// Upload profile image and update DB
router.post('/upload-image/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const imageUrl = req.file.path; // Cloudinary URL of uploaded image

    const result = await pool.query(
      'UPDATE admins SET image = $1 WHERE id = $2 RETURNING id, name, username, image',
      [imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Admin not found' });
    }

    return res.json({
      msg: 'Image uploaded successfully',
      admin: result.rows[0],
    });
  } catch (err) {
    console.error('Image upload error:', err);
    return res.status(500).json({ msg: 'Image upload failed' });
  }
});



module.exports = router;

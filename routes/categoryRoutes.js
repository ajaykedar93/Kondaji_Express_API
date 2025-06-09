const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

// Multer temp storage
const upload = multer({ dest: 'uploads/' });

/**
 * ============================================
 * 🌤️ Upload Category Image to Cloudinary
 * ============================================
 */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'category-images',
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    });

    fs.unlinkSync(req.file.path); // remove temp file
    res.status(200).json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * ============================================
 * ➕ Add New Category
 * ============================================
 */
router.post('/', async (req, res) => {
  const {
    name,
    description,
    image,
    offer_type,
    offer_value,
    offer_note,
    is_sale,
    is_active,
    valid_from,
    valid_to,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    await pool.query(
      `INSERT INTO categories
        (name, description, image, offer_type, offer_value, offer_note,
         is_sale, is_active, valid_from, valid_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        name,
        description || null,
        image || null,
        offer_type || null,
        offer_value || null,
        offer_note || null,
        is_sale ?? false,
        is_active ?? true,
        valid_from || null,
        valid_to || null,
      ]
    );
    res.status(201).json({ message: 'Category added successfully' });
  } catch (err) {
    console.error('❌ Insert Error:', err.message);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

/**
 * ============================================
 * 📥 Get All Categories
 * ============================================
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * ============================================
 * ✏️ Update Category by ID (Partial Update)
 * ============================================
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    image,
    offer_type,
    offer_value,
    offer_note,
    is_sale,
    is_active,
    valid_from,
    valid_to,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        image = COALESCE($3, image),
        offer_type = $4,
        offer_value = $5,
        offer_note = $6,
        is_sale = COALESCE($7, is_sale),
        is_active = COALESCE($8, is_active),
        valid_from = $9,
        valid_to = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        name,
        description,
        image,
        offer_type,
        offer_value,
        offer_note,
        is_sale,
        is_active,
        valid_from,
        valid_to,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category updated', category: result.rows[0] });
  } catch (err) {
    console.error('❌ Update Error:', err.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * ============================================
 * ❌ Delete Category by ID
 * ============================================
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Error:', err.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
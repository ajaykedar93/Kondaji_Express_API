const express = require('express');
const router = express.Router();
const pool = require('../db');

const TABLE = 'site_settings';

async function ensureSettingsRow() {
  const res = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
  if (parseInt(res.rows[0].count, 10) === 0) {
    await pool.query(
      `INSERT INTO ${TABLE} (site_name, banner_image, banner_text, contact_email, phone, address, footer_message, facebook_url, instagram_url, whatsapp_url)
       VALUES ('', '', '', '', '', '', '', '', '', '')`
    );
  }
}

router.get('/', async (req, res) => {
  try {
    await ensureSettingsRow();
    const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id LIMIT 1`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    res.status(500).json({ msg: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const {
      site_name = '',
      banner_image = '',
      banner_text = '',
      contact_email = '',
      phone = '',
      address = '',
      footer_message = '',
      facebook_url = '',
      instagram_url = '',
      whatsapp_url = '',
    } = req.body;

    await ensureSettingsRow();

    const updateQuery = `
      UPDATE ${TABLE} SET
        site_name = $1,
        banner_image = $2,
        banner_text = $3,
        contact_email = $4,
        phone = $5,
        address = $6,
        footer_message = $7,
        facebook_url = $8,
        instagram_url = $9,
        whatsapp_url = $10,
        updated_at = NOW()
      WHERE id = (SELECT id FROM ${TABLE} ORDER BY id LIMIT 1)
      RETURNING *
    `;

    const values = [
      site_name,
      banner_image,
      banner_text,
      contact_email,
      phone,
      address,
      footer_message,
      facebook_url,
      instagram_url,
      whatsapp_url,
    ];

    const result = await pool.query(updateQuery, values);
    res.json({ msg: 'Settings updated', data: result.rows[0] });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    res.status(500).json({ msg: 'Failed to update settings' });
  }
});

module.exports = router;

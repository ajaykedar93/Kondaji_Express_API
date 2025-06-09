const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// ✅ Setup Cloudinary + Multer storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kondaji_chiwda', // your folder in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage });

// ✅ Route: Upload to Cloudinary
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  res.status(200).json({
    msg: 'Image uploaded to Cloudinary',
    url: req.file.path, // this is the Cloudinary secure_url
  });
});

module.exports = router;

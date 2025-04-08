const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer'); // not './middleware'

router.post('/upload', upload.single('image'), (req, res) => {
  if (req.file && req.file.path) {
    res.json({ imageUrl: req.file.path });
  } else {
    res.status(400).json({ error: 'Upload failed' });
  }
});

module.exports = router;

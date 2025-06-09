const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'product_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] // add all necessary formats here
  }
});

const upload = multer({ storage });
module.exports = upload;

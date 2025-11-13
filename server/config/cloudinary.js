const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Configure Cloudinary with your credentials from the .env file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer-storage-cloudinary
// This tells multer to upload files to a specific folder in your Cloudinary account
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hyperlocal_posts', // The name of the folder in Cloudinary
    allowedFormats: ['jpeg', 'png', 'jpg'] // Allowed image formats
  }
});

module.exports = { cloudinary, storage };
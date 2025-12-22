const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

/* ===============================
   CLOUDINARY CONFIG
================================ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/* ===============================
   SHARED PARAM BUILDER (IMPORTANT)
================================ */
const buildParams = async (req, file) => {
  const isAudio = file.mimetype.startsWith('audio/');
  const isVideo = file.mimetype.startsWith('video/');
  const isImage = file.mimetype.startsWith('image/');

  return {
    folder: 'hyperlocal_messages',
    resource_type: isAudio || isVideo ? 'auto' : 'image',

    // ✅ DO NOT force "attachment" for audio/video
    // It breaks inline playback
    flags: isAudio || isVideo ? undefined : 'attachment',

    // ✅ Preserve original format
    format: undefined,

    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  };
};

/* ===============================
   POSTS STORAGE
================================ */
const postsStorage = new CloudinaryStorage({
  cloudinary,
  params: buildParams
});

/* ===============================
   MESSAGES STORAGE (CHAT)
================================ */
const messagesStorage = new CloudinaryStorage({
  cloudinary,
  params: buildParams
});

/* ===============================
   STREAMING URL (AUDIO / VIDEO)
================================ */
const getStreamingUrl = (publicId, resourceType = 'auto') => {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    quality: 'auto',
    fetch_format: 'auto'
  });
};

/* ===============================
   FILE DOWNLOAD URL
================================ */
const getDownloadUrl = (publicId, fileName) => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
    flags: 'attachment',
    attachment: fileName || 'file'
  });
};

module.exports = {
  cloudinary,
  postsStorage,
  messagesStorage,
  getStreamingUrl,
  getDownloadUrl
};

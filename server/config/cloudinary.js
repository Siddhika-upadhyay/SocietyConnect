const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

/* ===============================
   CLOUDINARY CONFIG
================================ */
// Validate environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary environment variables!');
  console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 60000, // 60 seconds timeout
  max_file_size: 50 * 1024 * 1024, // 50MB max file size
  invalid_file_size_response_code: 413
});

// Test connection on startup
cloudinary.api.ping()
  .then(result => {
    console.log('Cloudinary connection successful:', result);
  })
  .catch(error => {
    console.error('Cloudinary connection failed:', error);
  });

/* ===============================
   SAFE PARAM BUILDER (ENHANCED)
================================ */
const buildParams = async (req, file) => {
  // 🔥 FIX: Enhanced parameter building with better file type handling
  const mimeType = file.mimetype;
  
  // Determine resource type based on MIME type
  let resourceType = 'auto';
  if (mimeType.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType.startsWith('video/')) {
    resourceType = 'video';
  } else if (mimeType.startsWith('audio/')) {
    resourceType = 'video'; // Audio files use video resource type in Cloudinary
  } else {
    resourceType = 'raw'; // Documents and other files
  }

  const params = {
    folder: 'hyperlocal_messages',
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    
    // Quality optimizations
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  };

  // Add specific transformations based on file type
  if (mimeType.startsWith('image/')) {
    params.transformation = [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { width: 1920, height: 1080, crop: 'limit' }
    ];
  } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    params.transformation = [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ];
  }

  // Never use attachment flags for previewable content
  params.flags = undefined;

  return params;
};

/* ===============================
   STORAGE CONFIGS
================================ */
const buildPostsParams = async (req, file) => {
  const mimeType = file.mimetype;
  
  let resourceType = 'auto';
  if (mimeType.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType.startsWith('video/')) {
    resourceType = 'video';
  } else if (mimeType.startsWith('audio/')) {
    resourceType = 'video';
  } else {
    resourceType = 'raw';
  }

  const params = {
    folder: 'hyperlocal_posts',
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { width: 1920, height: 1080, crop: 'limit' }
    ]
  };

  return params;
};

const buildMessagesParams = async (req, file) => {
  const mimeType = file.mimetype;
  
  let resourceType = 'auto';
  if (mimeType.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType.startsWith('video/')) {
    resourceType = 'video';
  } else if (mimeType.startsWith('audio/')) {
    resourceType = 'video';
  } else {
    resourceType = 'raw';
  }

  const params = {
    folder: 'hyperlocal_messages',
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  };

  return params;
};

const postsStorage = new CloudinaryStorage({
  cloudinary,
  params: buildPostsParams
});

const messagesStorage = new CloudinaryStorage({
  cloudinary,
  params: buildMessagesParams
});

/* ===============================
   STREAMING URL
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
   DOWNLOAD URL (OPTIONAL)
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

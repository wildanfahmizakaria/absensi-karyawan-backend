const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads/selfies');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user.id : 'anon';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    const cleanExt = ext.toLowerCase();
    const action = req.path.includes('check-out') ? 'checkout' : 'checkin';
    cb(null, `${action}_u${userId}_${timestamp}${cleanExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Hanya file foto format JPEG, JPG, PNG, atau WebP yang diperbolehkan.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024
  }
});

module.exports = {
  upload,
  uploadDir
};


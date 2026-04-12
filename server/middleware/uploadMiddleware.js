// server/middleware/uploadMiddleware.js
// Multer configuration for leave request file attachments
// =========================================================
// Accepts PDF and image files up to 5MB.
// Files are stored in server/uploads/ with unique names.
// =========================================================

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure the uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// =============================================================
// Storage engine: disk storage with unique filenames
// =============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // SECURITY: Generate a cryptographically random filename to prevent
    // directory traversal attacks and filename collisions.
    // Original extension is preserved for serving purposes.
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// =============================================================
// File filter: only allow PDF and image files
// =============================================================
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // SECURITY: Reject files with unsupported MIME types.
    // This prevents upload of executable or script files.
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Invalid file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, WebP.`
      ),
      false
    );
  }
};

// =============================================================
// Multer instance with constraints
// =============================================================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1,                   // Only 1 file per request
  },
});

// =============================================================
// Middleware: single file upload under field name "attachment"
// Wraps multer to provide user-friendly error messages
// =============================================================
const uploadAttachment = (req, res, next) => {
  const singleUpload = upload.single('attachment');

  singleUpload(req, res, (err) => {
    if (err) {
      // Handle Multer-specific errors with clear messages
      if (err instanceof multer.MulterError) {
        let message = 'File upload error.';

        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File is too large. Maximum allowed size is 5MB.';
            break;
          case 'LIMIT_FILE_COUNT':
            message = 'Only 1 file is allowed per request.';
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message =
              err.field ||
              'Invalid file type. Only PDF, JPEG, PNG and WebP are accepted.';
            break;
          default:
            message = `Upload error: ${err.message}`;
        }

        return res.status(400).json({
          success: false,
          message,
          code: 'UPLOAD_ERROR',
        });
      }

      // Generic upload errors
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during file upload.',
      });
    }

    next();
  });
};

module.exports = { uploadAttachment, UPLOAD_DIR };

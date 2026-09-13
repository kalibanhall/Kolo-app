const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Images are stored directly on the VPS disk (server/uploads/<folder>/...)
// instead of an external service, and served back via express.static /
// nginx (see server.js and the nginx site config).
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Configure multer for memory storage (we write the buffer to disk ourselves)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per file (typical phone camera photos)
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Only allow simple, predictable folder names (no path traversal via ../..)
const sanitizeFolder = (folder) => {
  const clean = String(folder || 'kolo').replace(/[^a-zA-Z0-9_-]/g, '');
  return clean || 'kolo';
};

const saveFileToDisk = (file, folder) => {
  const safeFolder = sanitizeFolder(folder);
  const dir = path.join(UPLOADS_ROOT, safeFolder);
  fs.mkdirSync(dir, { recursive: true });

  const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname || '') || '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return {
    success: true,
    url: `/uploads/${safeFolder}/${filename}`,
    public_id: `${safeFolder}/${filename}`,
  };
};

// Upload single image
router.post('/image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const { folder = 'kolo' } = req.body;
    const result = saveFileToDisk(req.file, folder);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
});

// Upload multiple images
router.post('/images', verifyToken, upload.array('images', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    const { folder = 'kolo' } = req.body;
    const results = req.files.map((file) => saveFileToDisk(file, folder));

    res.json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images',
    });
  }
});

// Delete image
router.delete('/image/:publicId', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Decode public_id (replace _ with / for folder structure, matches upload's `folder/filename`)
    const decodedPublicId = decodeURIComponent(publicId.replace(/_/g, '/'));

    const filePath = path.join(UPLOADS_ROOT, decodedPublicId);
    const resolved = path.normalize(filePath);

    // Guard against path traversal — resolved path must stay inside UPLOADS_ROOT
    if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image',
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 8MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next(error);
});

module.exports = router;

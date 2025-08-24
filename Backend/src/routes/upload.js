const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // Import the multer middleware
const auth = require('../middleware/auth'); // Your authentication middleware

/*
 * @route   POST /api/uploads
 * @desc    Upload a single file to Cloudinary
 * @access  Private
 */
router.use(auth);

router.post('/', upload.single('file'), (req, res) => {
  // 'file' must match the FormData key from the frontend

  if (!req.file) {
    return res.status(400).json({ message: 'No file was uploaded.' });
  }

  // At this point, the file is already uploaded to Cloudinary by the middleware.
  // The details are available in req.file.
  // We just need to send the relevant information back to the frontend.
  res.status(201).json({
    url: req.file.path, // This is the secure URL from Cloudinary
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    // Determine the attachment type based on the mimetype
    type: req.file.mimetype.startsWith('image') ? 'IMAGE' :
          req.file.mimetype.startsWith('video') ? 'VIDEO' :
          req.file.mimetype.startsWith('audio') ? 'AUDIO' : 'FILE',
  });
});

module.exports = router;
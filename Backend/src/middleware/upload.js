const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); 

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chatapp_files', // Folder in Cloudinary to store files
    resource_type: 'auto', // Automatically detect file type
    // Use the original filename for the public_id
    public_id: (req, file) => {
      // Remove file extension for a cleaner public_id
      return file.originalname.split('.').slice(0, -1).join('.');
    },
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit, for example
  fileFilter: (req, file, cb) => {
    // You can add validation for file types here if you want
    cb(null, true);
  },
});

module.exports = upload;
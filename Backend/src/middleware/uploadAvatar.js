const multer  = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const MAX_SIZE = 2 * 1024 * 1024

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chatapp/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 256, height: 256, crop: "fill" }],
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: MAX_SIZE },          //  ⬅️  here
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
      return cb(new Error("Only image files allowed"));
    cb(null, true);
  },
});
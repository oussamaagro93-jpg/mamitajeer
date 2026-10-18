const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const ApiError = require('../utils/ApiError');

var fileFilter = function (req, file, cb) {
  var allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  var ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (jpg, jpeg, png, gif, webp) are allowed'), false);
  }
};

var createUploader = function (subfolder) {
  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      var uploadPath = path.join(__dirname, '../../', config.upload.dir, subfolder);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      var ext = path.extname(file.originalname).toLowerCase();
      var uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: config.upload.maxFileSize },
  });
};

var uploadCategory = createUploader('categories');
var uploadProduct = createUploader('products');

module.exports = { createUploader: createUploader, uploadCategory: uploadCategory, uploadProduct: uploadProduct };

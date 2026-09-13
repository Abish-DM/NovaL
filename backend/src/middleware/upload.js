const multer = require('multer');
const config = require('../config/env');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
});

module.exports = upload;

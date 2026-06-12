import multer from 'multer';
import path from 'path';
import fs from 'fs';

// For certificates (local disk storage)
const certificateStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = 'uploads/certificates';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});


const memoryStorage = multer.memoryStorage();

const uploadCertificate = multer({ storage: certificateStorage });
const uploadVideo = multer({ storage: memoryStorage });

export { uploadCertificate, uploadVideo };

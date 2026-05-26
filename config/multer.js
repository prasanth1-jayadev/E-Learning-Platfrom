import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { cloudinary } from './cloudinary.js';

const require = createRequire(import.meta.url);
const CloudinaryStorage = require('multer-storage-cloudinary');

// For certificates (local storage)
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

// For videos (Cloudinary storage)
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'course-videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  }
});

const uploadCertificate = multer({ storage: certificateStorage });
const uploadVideo = multer({ storage: videoStorage });

export { uploadCertificate, uploadVideo };

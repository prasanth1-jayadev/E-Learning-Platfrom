import pkg from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const cloudinary = pkg.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — files are kept in memory as Buffer
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

// Helper: upload a Buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'uploads', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

export { upload, cloudinary, uploadToCloudinary };

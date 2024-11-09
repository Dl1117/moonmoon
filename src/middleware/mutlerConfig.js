import multer from 'multer';

// Configure Multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10 MB per file
});

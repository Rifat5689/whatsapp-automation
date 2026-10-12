import ApiError from '../utils/ApiError.js';
import multer from 'multer';

const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.path}`));

const errorHandler = (error, _req, res, _next) => {
  const uploadError = error instanceof multer.MulterError;
  const statusCode = uploadError ? 400 : error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message: uploadError ? (error.code === 'LIMIT_FILE_SIZE' ? (error.field === 'chats' ? 'Chat export exceeds 1 MB' : 'Photo exceeds 5 MB') : 'Upload rejected') : statusCode === 500 ? 'Unexpected server error' : error.message,
    errors: error.errors || []
  });
};

export { errorHandler, notFound };

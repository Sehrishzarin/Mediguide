// Wrap async route handlers so rejected promises reach the error handler
exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Typed error for expected failures (validation, permissions, ...)
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
exports.HttpError = HttpError;

exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier supplied.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2 MB).' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body.';
  }

  if (status >= 500) {
    console.error(err);
    message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status).json({ success: false, message });
};

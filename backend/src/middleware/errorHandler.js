const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {})
  });
};

module.exports = errorHandler;

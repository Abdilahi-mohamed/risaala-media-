const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
  if (error) {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      details: error.details.map((detail) => ({ message: detail.message, path: detail.path }))
    });
  }
  next();
};

module.exports = validateRequest;

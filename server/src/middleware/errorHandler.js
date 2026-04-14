function errorHandler(err, _req, res, _next) {
  const status = Number(err.status || 500);
  const payload = {
    error: {
      message: status === 500 ? "Internal server error" : err.message,
    },
  };

  if (err.details !== undefined) payload.error.details = err.details;

  if (process.env.NODE_ENV !== "production" && status === 500) {
    payload.error.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = { errorHandler };

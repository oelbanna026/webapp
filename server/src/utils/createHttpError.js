function createHttpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details !== undefined) err.details = details;
  return err;
}

module.exports = { createHttpError };

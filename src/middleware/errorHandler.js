const isDupKeyError = (err) => err?.code === 11000;

export const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  if (isDupKeyError(err)) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyPattern || {})[0] || "resource";
    message = `${duplicateField} already exists`;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors || {}).map((e) => e.message);
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
  }

  if (!isProd || statusCode >= 500) {
    console.error(err);
  }

  const payload = {
    success: false,
    message
  };

  if (details) payload.details = details;
  if (!isProd && err.stack) payload.stack = err.stack;

  res.status(statusCode).json(payload);
};

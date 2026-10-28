import { validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error(
    `${req.method} ${req.path}:`,
    err?.name || "Error",
    err?.message || "Unknown error",
  );

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "Value";
    return res.status(409).json({ message: `${field} already exists` });
  }

  if (err.name === "CastError" || err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request data" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Default error
  const status = err.status || 500;
  const message = status < 500 ? err.message || "Request failed" : "Server error";
  res.status(status).json({ message });
};

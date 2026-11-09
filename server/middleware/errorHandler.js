import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Data validation error';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. It must be unique.`;
  }

  // Handle invalid ObjectId cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found or invalid identifier for ${err.path}.`;
  }

  // Prevent leaking stack trace in production
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (statusCode >= 500) {
    console.error(`[Error] [${req.method}] ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(response);
};

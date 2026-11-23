import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();

// Request Correlation ID Middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.id = reqId;
  res.setHeader('x-request-id', reqId);
  next();
});

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed from this origin'));
      }
    },
    credentials: true,
  })
);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Top-level Health & Readiness Probes (for load balancers & container orchestrators)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'SmartCRM API',
    version: '1.0.0',
    requestId: req.id,
  });
});

app.get('/ready', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (!isDbReady) {
    return res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  }
  return res.json({
    status: 'ready',
    database: 'connected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    requestId: req.id,
  });
});

// Rate Limiting
app.use('/api', apiLimiter);

// Main API Router
app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SmartCRM — AI-Powered Customer Relationship & Subscription Management Platform API',
    documentation: '/api/v1/health',
  });
});

// 404 Not Found Catch-All
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;

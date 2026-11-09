import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initBackgroundJobs } from './jobs/cronJobs.js';
import { User } from './models/User.js';
import { seedDatabase } from './scripts/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is currently empty (e.g. fresh in-memory or new local db)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Auto-seeding demonstration records...');
      await seedDatabase();
    }

    initBackgroundJobs();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 SmartCRM Server running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    const shutdown = () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Server] Fatal error during server startup:', error);
    process.exit(1);
  }
};

startServer();

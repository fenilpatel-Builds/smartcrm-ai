import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcrm';

  try {
    console.log(`[Database] Connecting to MongoDB at ${uri.split('@')[0]}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection failed: ${err.message}`);
    console.log('[Database] Starting in-memory MongoDB fallback for zero-config local execution...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'smartcrm',
        },
      });
      const memoryUri = memoryServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Successfully connected to in-memory MongoDB: ${memoryUri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Failed to initialize in-memory MongoDB fallback:`, memErr);
      throw memErr;
    }
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log('[Database] Connection closed.');
  } catch (error) {
    console.error('[Database] Error closing connection:', error);
  }
};

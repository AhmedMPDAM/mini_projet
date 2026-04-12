// server/config/db.js
// MongoDB connection configuration using Mongoose

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ uses these defaults, but we set them explicitly for clarity
      autoIndex: true,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // SECURITY: Exit on DB failure to prevent the app from running
    // in a degraded state without authentication capabilities
    process.exit(1);
  }
};

module.exports = connectDB;

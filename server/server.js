// server/server.js
// Express application entry point
// =========================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================
// Connect to MongoDB
// =============================================================
connectDB();

// =============================================================
// Global Middleware
// =============================================================

// SECURITY: Configure CORS to only allow requests from the frontend origin.
// credentials: true is required for cookies (refresh tokens) to be sent.
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON request bodies (limit size to prevent abuse)
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Parse cookies (needed for refresh token)
app.use(cookieParser());

// =============================================================
// Routes
// =============================================================
app.use('/api/auth', authRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/calendar', require('./routes/calendarRoutes'));

// Serve uploaded files statically (for attachment downloads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================
// 404 handler
// =============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// =============================================================
// Global error handler
// =============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
  });
});

// =============================================================
// Start server
// =============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

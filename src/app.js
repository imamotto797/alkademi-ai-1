require('dotenv').config();
const express = require('express');
const cors = require('cors');
const materialRoutes = require('./routes/materialRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { initDB } = require('./models/initDB');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Routes
app.use('/api/materials', materialRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root API endpoint
app.get('/api', (req, res) => {
  res.status(200).json({ 
    message: 'AI Teaching Materials API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      materials: '/api/materials',
      analytics: '/api/analytics'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
let server;

const startServer = async () => {
  try {
    // Try to initialize database, but continue if it fails
    try {
      await initDB();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.warn('⚠️ Database initialization failed, continuing without DB:', dbError.message);
    }
    
    const PORT = process.env.PORT || 3000;
    server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit immediately, try to start with limited functionality
    const PORT = process.env.PORT || 3000;
    try {
      server = app.listen(PORT, () => {
        console.log(`⚠️ Server started on port ${PORT} (limited functionality)`);
      });
    } catch (listenError) {
      console.error('Fatal error:', listenError);
      process.exit(1);
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing server gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      console.log('Port released successfully');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill command
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT')); // Ctrl+\

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();
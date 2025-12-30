const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Initialize Sentry FIRST (before any other middleware)
const { initSentry, sentryErrorHandler } = require('./config/sentry');
const { setupSwagger } = require('./config/swagger');
const { initializeFirebase } = require('./services/firebaseNotifications');
const { initializeSupabase } = require('./services/supabaseService');
const { initializeCronJobs } = require('./services/cronJobs');

// Import rate limiters
const {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  registrationLimiter,
  passwordResetLimiter,
  contactLimiter,
  adminLimiter,
  drawLimiter,
} = require('./middleware/rateLimiter');

const app = express();

// Initialize Sentry
initSentry(app);

// Initialize Supabase (optional)
initializeSupabase();

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Vercel deployments
    if (origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Allow specific production domain
    const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '').split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Setup Swagger API Documentation
setupSwagger(app);

// Apply general API rate limiting
app.use('/api/', apiLimiter);

// Routes with specific rate limiting
app.use('/api/auth/login', authLimiter, require('./routes/auth'));
app.use('/api/auth/register', registrationLimiter, require('./routes/auth'));
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/tickets', paymentLimiter, require('./routes/tickets'));
app.use('/api/payments', paymentLimiter, require('./routes/payments'));
app.use('/api/wallet', paymentLimiter, require('./routes/wallet'));
app.use('/api/admin', adminLimiter, require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/password-reset', passwordResetLimiter, require('./routes/passwordReset'));
app.use('/api/contact', contactLimiter, require('./routes/contact'));
app.use('/api/upload', require('./routes/upload'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'KOLO API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to KOLO Tombola API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KOLO Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  
  // Initialize Firebase after server starts
  initializeFirebase();
  
  // Initialize cron jobs for automated tasks
  initializeCronJobs();
});

module.exports = app;
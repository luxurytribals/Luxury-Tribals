require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const paymentRoutes = require('./routes/payments');
const orderRoutes = require('./routes/orders');
const shippingRoutes = require('./routes/shipping');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');

// ========================================
// ENVIRONMENT VALIDATION
// ========================================
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SHIPROCKET_EMAIL',
  'SHIPROCKET_PASSWORD'
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ ERROR: Missing required environment variables:');
  console.error('   ', missing.join(', '));
  console.error('');
  console.error('📝 To fix this:');
  console.error('   1. Copy .env.example to .env');
  console.error('   2. Fill in all required values');
  console.error('   3. Restart the server');
  process.exit(1);
}

// Validate JWT_SECRET length
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ ERROR: JWT_SECRET must be at least 32 characters long');
  console.error('📝 Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();

// ========================================
// DATABASE CONNECTION
// ========================================
connectDB();

// ========================================
// SECURITY & MIDDLEWARE
// ========================================
const globalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: 'Too many login attempts, please try again later.'
});

// Configure CORS based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:5501',
      'http://127.0.0.1:5501',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      process.env.FRONTEND_URL
    ].filter(Boolean);

app.use(helmet());
app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// Special handling for Razorpay webhook (needs raw body)
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));

// JSON body parser for all other routes
app.use(express.json());

// ========================================
// ROUTES
// ========================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);

// Health check endpoint
app.get('/health', (_req, res) => res.json({ 
  ok: true, 
  service: 'luxury-tribals-api',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
}));

// Root endpoint
app.get('/', (_req, res) => res.json({ 
  message: 'Luxury Tribals API',
  version: '1.0.0',
  docs: '/health'
}));

// ========================================
// ERROR HANDLING
// ========================================
// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Server Error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Luxury Tribals API Server Started');
  console.log('====================================');
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log('====================================');
  console.log('');
});

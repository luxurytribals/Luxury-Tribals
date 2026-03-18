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

const app = express();
connectDB();

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL].filter(Boolean) }));
app.use(morgan('dev'));
app.use(globalLimiter);
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'luxury-tribals-api' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

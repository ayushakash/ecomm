const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const responseTime = require('response-time');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
// app.use(limiter);

// Response time header
app.use(responseTime());

// Logging middleware (morgan)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Database connection (skip in test mode — tests/setup.js handles the in-memory DB connection)
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-ecommerce', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));
}

// Health check endpoint (for frontend IP detection)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/merchants', require('./routes/merchants'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/platform-earnings', require('./routes/platformEarnings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/calculator-leads', require('./routes/calculatorLeads'));

// New routes for logging and notifications
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/smart-notifications', require('./routes/smartNotifications'));
app.use('/api/order-logs', require('./routes/orderLogs'));
app.use('/api/abandoned-carts', require('./routes/abandonedCarts'));

// Device token routes for push notifications
app.use('/api/merchants/device-token', require('./routes/deviceToken'));

// Sequential notification routes
app.use('/api/sequential-notifications', require('./routes/sequentialNotifications'));

// Webhook routes (for n8n and MSG91 callbacks)
app.use('/api/webhooks', require('./routes/webhooks'));

// Test notification routes

// MSG91 OTP Test routes

// Serve static files from client/public (for test pages)
app.use(express.static('client/public'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
  });
}

module.exports = app;

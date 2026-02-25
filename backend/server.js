require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB, sequelize } = require('./config/db');
require('./models');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const walletRoutes = require('./routes/walletRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const couponRoutes = require('./routes/couponRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  cors({
    origin: true,
    credentials: false
  })
);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

app.use('/api', apiLimiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* ================= API ROUTES ================= */

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'SkillMart API is running' });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'SkillMart API root',
    routes: [
      '/api/health',
      '/api/auth',
      '/api/services',
      '/api/orders',
      '/api/reviews',
      '/api/admin',
      '/api/favorites',
      '/api/notifications',
      '/api/invoices',
      '/api/disputes',
      '/api/analytics',
      '/api/wallet',
      '/api/categories',
      '/api/subscriptions',
      '/api/withdrawals',
      '/api/coupons',
      '/api/portfolio'
    ]
  });
});

app.use('/invoices', express.static(path.join(__dirname, 'storage', 'invoices')));

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/portfolio', portfolioRoutes);

/* ================= SERVE FRONTEND ================= */

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ================= ERROR HANDLER ================= */

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const bcrypt = require('bcryptjs');
const { User } = require('./models');

const seedAdmin = async () => {
  const adminEmail = "admin@skillmart.com";

  const existing = await User.findOne({ where: { email: adminEmail } });

  if (!existing) {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await User.create({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin seeded successfully");
  }
};

/*const startServer = async () => {
  await connectDB();
  await sequelize.sync({
    alter: (process.env.NODE_ENV || 'development') !== 'production'
  });*/

const startServer = async () => {
  try {
    await connectDB();

    // In development allow alter, in production do safe sync
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Database synced (development mode with alter).');
    } else {
      await sequelize.sync();
      console.log('Database synced (production mode).');
    }
  

  app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
  });
};

startServer();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables before anything reads them
dotenv.config();

const connectDB = require('./src/config/db');
const healthRoutes = require('./src/routes/health.routes');
const authRoutes = require('./src/routes/auth.routes');
const organizationRoutes = require('./src/routes/organization.routes');
const slotRoutes = require('./src/routes/slot.routes');
const fileRoutes = require('./src/routes/file.routes');
const aiRoutes = require('./src/routes/ai.routes');
const { notFound, errorHandler } = require('./src/middlewares/error');

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Needed so rate limiting sees the real client IP behind Vercel/Render/Nginx
app.set('trust proxy', 1);

// Allowed browser origins: CLIENT_ORIGIN (comma separated) plus the Capacitor shells and local dev
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  'http://localhost', 'https://localhost', 'capacitor://localhost',
  'http://localhost:5173', 'http://127.0.0.1:5173'
];
const isLanDev = (origin) => process.env.NODE_ENV !== 'production' && /^http:\/\/(\d{1,3}\.){3}\d{1,3}:\d+$/.test(origin);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header = native app / curl / same-origin
    if (!origin || allowedOrigins.includes(origin) || isLanDev(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => res.send('MediGuide Backend API is active.'));

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();

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
const monitoringRoutes = require('./src/routes/monitoring.routes');
const { journalRouter, cycleRouter, plansRouter } = require('./src/routes/journal.routes');
const { startScheduler } = require('./src/services/monitoring');
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

// Allowed browser origins: CLIENT_ORIGIN (comma separated, e.g. a custom domain), any Vercel
// deployment (production + preview URLs), the Capacitor app shells and local development.
// Auth uses bearer tokens (not cookies), so CORS is not the security boundary here.
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
  'http://localhost', 'https://localhost', 'capacitor://localhost'
];
const isVercel = (origin) => /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin);
// Any localhost / LAN-IP port (Vite dev servers, phones on the same network)
const isLocalDev = (origin) => /^http:\/\/(localhost|127\.0\.0\.1|(\d{1,3}\.){3}\d{1,3}):\d+$/.test(origin);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header = native app / curl / same-origin
    if (!origin || allowedOrigins.includes(origin) || isVercel(origin) || isLocalDev(origin)) return cb(null, true);
    console.warn(`CORS blocked origin: ${origin} (add it to CLIENT_ORIGIN)`);
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
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/journal', journalRouter);
app.use('/api/cycle', cycleRouter);
app.use('/api/plans', plansRouter);

app.get('/', (req, res) => res.send('MediGuide Backend API is active.'));

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  startScheduler(); // Nura Check-In escalation timers
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();

// Last-resort guards: log unexpected errors instead of taking the whole API down
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1); // let the host (Render/nodemon) restart a clean process
});

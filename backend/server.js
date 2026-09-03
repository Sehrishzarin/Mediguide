const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const healthRoutes = require('./src/routes/health.routes');
const authRoutes = require('./src/routes/auth.routes');
const organizationRoutes = require('./src/routes/organization.routes');
const aiRoutes = require('./src/routes/ai.routes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('MediGuide Backend API is active.');
});

// Start Server
const startServer = async () => {
  // Connect to MongoDB if URI is provided
  if (process.env.MONGODB_URI) {
    await connectDB();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} and network interfaces on port ${PORT}`);
  });
};

startServer();

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const healthRoutes = require('./src/routes/health.routes');

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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer();

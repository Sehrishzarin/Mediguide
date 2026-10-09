const dns = require('dns');
// Some networks (and Node on Windows) resolve via 127.0.0.1, which cannot answer the
// SRV lookup that mongodb+srv:// URIs need. Public resolvers make Atlas reachable.
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Not fatal: fall back to the system resolver
}

const mongoose = require('mongoose');

const ATTEMPTS = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Connect with retries, or exit. Running without a database only produces
// confusing "Something went wrong" errors on every request.
const connectDB = async () => {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${ATTEMPTS} failed: ${error.message}`);
      if (attempt < ATTEMPTS) await sleep(attempt * 2000);
    }
  }
  console.error('Could not connect to MongoDB. Check MONGODB_URI, the Atlas IP access list and your network/DNS.');
  process.exit(1);
};

module.exports = connectDB;

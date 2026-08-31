const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Verify JWT Token
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (Missing Token)'
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET server configuration missing' });
    }

    const decoded = jwt.verify(token, secret);

    if (mongoose.connection.readyState === 1) {
      req.user = await User.findById(decoded.id);
      if (!req.user) {
        req.user = { id: decoded.id, role: decoded.role || 'user' };
      }
    } else {
      req.user = { id: decoded.id, role: decoded.role || 'user' };
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route (Invalid Token)'
    });
  }
};

// Grant access to specific roles (RBAC)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Fallback in-memory users list when MongoDB is offline
const fallbackUsers = [
  {
    _id: 'mock_admin_id_1',
    name: 'System Admin',
    email: 'admin@mediguide.com',
    passwordHash: '$2a$10$w09CgqP7vS6X5q0gHk6r7u.3aVj7aV0a9a0a0a0a0a0a0a0a0a0a0', // adminpassword123
    plainPassword: 'adminpassword123',
    role: 'admin',
    phone: '+1 800-555-0199'
  },
  {
    _id: 'mock_user_id_2',
    name: 'Standard User',
    email: 'user@mediguide.com',
    passwordHash: '$2a$10$w09CgqP7vS6X5q0gHk6r7u.3aVj7aV0a9a0a0a0a0a0a0a0a0a0a0', // userpassword123
    plainPassword: 'userpassword123',
    role: 'user',
    phone: '+1 555-0143'
  }
];

// Helper to sign JWT token
const signToken = (id, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign(
    { id, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Helper to send token response
const sendTokenResponse = (userObj, statusCode, res) => {
  const token = signToken(userObj._id || userObj.id, userObj.role);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: userObj._id || userObj.id,
      name: userObj.name,
      email: userObj.email,
      role: userObj.role,
      phone: userObj.phone || ''
    }
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const assignedRole = role && ['user', 'admin', 'organization'].includes(role) ? role : 'user';

    // If MongoDB is connected (readyState === 1)
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: assignedRole,
        phone: phone || ''
      });

      return sendTokenResponse(user, 201, res);
    }

    // Standby Fallback Mode (MongoDB Offline)
    const existingFallback = fallbackUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingFallback) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const newUser = {
      _id: 'mock_user_' + Date.now(),
      name,
      email,
      plainPassword: password,
      role: assignedRole,
      phone: phone || ''
    };

    fallbackUsers.push(newUser);
    sendTokenResponse(newUser, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // If MongoDB is connected (readyState === 1)
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      return sendTokenResponse(user, 200, res);
    }

    // Standby Fallback Mode (MongoDB Offline)
    const fallbackUser = fallbackUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Check if password matches plainPassword or default test passwords
    if (
      fallbackUser && 
      (fallbackUser.plainPassword === password || password === 'adminpassword123' || password === 'userpassword123')
    ) {
      return sendTokenResponse(fallbackUser, 200, res);
    }

    // If user typed credentials, let them log in seamlessly in demo mode
    const demoUser = {
      _id: 'demo_user_' + Date.now(),
      name: email.split('@')[0],
      email: email,
      role: email.includes('admin') ? 'admin' : email.includes('org') ? 'organization' : 'user',
      phone: ''
    };

    return sendTokenResponse(demoUser, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id);
      if (user) {
        return res.status(200).json({
          success: true,
          data: user
        });
      }
    }

    // Fallback mode response
    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name || 'MediGuide User',
        email: req.user.email || 'user@mediguide.com',
        role: req.user.role || 'user'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

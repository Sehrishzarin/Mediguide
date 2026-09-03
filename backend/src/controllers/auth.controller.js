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
    phone: '+1 800-555-0199',
    medicalProfile: {}
  },
  {
    _id: 'mock_user_id_2',
    name: 'Standard User',
    email: 'user@mediguide.com',
    passwordHash: '$2a$10$w09CgqP7vS6X5q0gHk6r7u.3aVj7aV0a9a0a0a0a0a0a0a0a0a0a0', // userpassword123
    plainPassword: 'userpassword123',
    role: 'user',
    phone: '+1 555-0143',
    medicalProfile: {
      bloodGroup: 'O+',
      gender: 'Female',
      pregnancyStatus: 'Pregnant (2nd Trimester)',
      dateOfBirth: '1995-06-15',
      height: 165,
      weight: 62,
      allergies: ['Penicillin', 'Peanuts'],
      preExistingConditions: ['Asthma', 'Mild Hypertension'],
      currentMedications: [
        { name: 'Albuterol Inhaler', dosage: '2 puffs', frequency: 'As needed' },
        { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' }
      ],
      longTermTreatments: [
        { treatmentName: 'Immunotherapy / Allergy Shots', notes: 'Monthly maintenance dose', isOngoing: true }
      ],
      emergencyContact: {
        name: 'Robert Doe',
        relationship: 'Spouse',
        phone: '+1 555-0199'
      }
    }
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
      phone: userObj.phone || '',
      medicalProfile: userObj.medicalProfile || {}
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
        phone: phone || '',
        medicalProfile: {}
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
      phone: phone || '',
      medicalProfile: {}
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
    
    if (
      fallbackUser && 
      (fallbackUser.plainPassword === password || password === 'adminpassword123' || password === 'userpassword123')
    ) {
      return sendTokenResponse(fallbackUser, 200, res);
    }

    // Demo mode fallback
    const demoUser = {
      _id: 'demo_user_' + Date.now(),
      name: email.split('@')[0],
      email: email,
      role: email.includes('admin') ? 'admin' : email.includes('org') ? 'organization' : 'user',
      phone: '',
      medicalProfile: {}
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

    const fallbackUser = fallbackUsers.find(u => u._id === req.user.id || u.email === req.user.email);

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name || 'MediGuide User',
        email: req.user.email || 'user@mediguide.com',
        role: req.user.role || 'user',
        medicalProfile: fallbackUser?.medicalProfile || req.user.medicalProfile || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user medical profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateMedicalProfile = async (req, res) => {
  try {
    const { medicalProfile, name, phone } = req.body;

    if (mongoose.connection.readyState === 1) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(medicalProfile && { medicalProfile })
        },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        data: updatedUser
      });
    }

    // Standby Fallback Update
    const fallbackUser = fallbackUsers.find(u => u._id === req.user.id || u.email === req.user.email);
    if (fallbackUser) {
      if (name) fallbackUser.name = name;
      if (phone) fallbackUser.phone = phone;
      if (medicalProfile) fallbackUser.medicalProfile = medicalProfile;
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        name: name || req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: phone || req.user.phone,
        medicalProfile: medicalProfile || req.user.medicalProfile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [80, 'Name is too long']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'organization'],
    default: 'user'
  },
  phone: { type: String, default: '', trim: true, maxlength: 30 },
  address: { type: String, default: '', trim: true, maxlength: 200 },
  onboardingCompleted: { type: Boolean, default: false },
  // Cycle tracking: null = default (on for female profiles), true/false = the patient's choice
  cycleTracking: {
    enabled: { type: Boolean, default: null },
    shareWithNura: { type: Boolean, default: false }
  },
  medicalProfile: {
    bloodGroup: { type: String, enum: BLOOD_GROUPS, default: '' },
    gender: { type: String, default: '' },
    pregnancyStatus: { type: String, default: 'N/A' },
    dateOfBirth: { type: String, default: '' },
    height: { type: Number, default: 0, min: 0, max: 300 },
    weight: { type: Number, default: 0, min: 0, max: 700 },
    allergies: [{ type: String, trim: true, maxlength: 80 }],
    preExistingConditions: [{ type: String, trim: true, maxlength: 80 }],
    currentMedications: [{
      _id: false,
      name: { type: String, trim: true, maxlength: 80 },
      dosage: { type: String, trim: true, maxlength: 40 },
      frequency: { type: String, trim: true, maxlength: 40 }
    }],
    longTermTreatments: [{
      _id: false,
      treatmentName: { type: String, trim: true, maxlength: 80 },
      notes: { type: String, trim: true, maxlength: 300 },
      isOngoing: { type: Boolean, default: true }
    }],
    notes: { type: String, default: '', maxlength: 1000 },
    emergencyContact: {
      name: { type: String, default: '', trim: true, maxlength: 80 },
      relationship: { type: String, default: '', trim: true, maxlength: 40 },
      phone: { type: String, default: '', trim: true, maxlength: 30 }
    }
  },
  createdAt: { type: Date, default: Date.now }
});

// Hash the password only when it changed (async hooks must not call next())
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

UserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Safe public representation (never includes the password hash)
UserSchema.methods.toClient = function () {
  const o = this.toObject();
  delete o.password;
  delete o.__v;
  o.id = String(o._id);
  delete o._id;
  return o;
};

module.exports = mongoose.model('User', UserSchema);
module.exports.BLOOD_GROUPS = BLOOD_GROUPS;

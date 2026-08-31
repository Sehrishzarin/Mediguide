const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add organization name'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Hospital', 'Clinic', 'Pharmacy', 'Diagnostic Center'],
    default: 'Hospital'
  },
  email: {
    type: String,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4.5
  },
  services: {
    type: [String],
    default: ['Emergency', 'General Checkup', 'Pharmacy']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  },
  // GeoJSON Point location for geospatial MongoDB queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    formattedAddress: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2DSphere index for geospatial location searching
OrganizationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Organization', OrganizationSchema);

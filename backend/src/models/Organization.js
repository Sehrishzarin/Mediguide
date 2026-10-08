const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please add organization name'], trim: true, maxlength: 120 },
  type: {
    type: String,
    enum: ['Hospital', 'Clinic', 'Pharmacy', 'Diagnostic Center'],
    default: 'Hospital'
  },
  email: { type: String, lowercase: true, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, required: [true, 'Please add an address'], trim: true, maxlength: 200 },
  services: { type: [String], default: [] },
  // Partner = registered on MediGuide (bookable). Non-partner = public facility listing.
  isPartner: { type: Boolean, default: true },
  allowAppBooking: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  owner: { type: mongoose.Schema.ObjectId, ref: 'User', index: true },
  staff: [{
    name: { type: String, required: true, trim: true, maxlength: 80 },
    specialty: { type: String, trim: true, default: 'General Physician', maxlength: 60 }
  }],
  reviews: [{
    patientId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    patientName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 600 },
    visitDate: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  // Rating from public sources for non-partner listings
  publicRating: { type: Number, default: 0 },
  publicReviewsCount: { type: Number, default: 0 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    formattedAddress: String
  },
  createdAt: { type: Date, default: Date.now }
});

OrganizationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Organization', OrganizationSchema);

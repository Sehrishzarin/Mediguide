const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');

const samplePatients = [
  { name: 'Sarah Jenkins', email: 'sarah.j@example.com', role: 'user', phone: '+1 555-0191' },
  { name: 'Michael Chen', email: 'mchen@example.com', role: 'user', phone: '+1 555-0192' },
  { name: 'Elena Rostova', email: 'elena.r@example.com', role: 'user', phone: '+1 555-0193' },
  { name: 'David Miller', email: 'david.m@example.com', role: 'user', phone: '+1 555-0194' },
  { name: 'Ayesha Khan', email: 'ayesha.k@example.com', role: 'user', phone: '+1 555-0195' },
  { name: 'James Wilson', email: 'jwilson@example.com', role: 'user', phone: '+1 555-0196' },
  { name: 'Priya Sharma', email: 'psharma@example.com', role: 'user', phone: '+1 555-0197' },
  { name: 'Carlos Rodriguez', email: 'crodriguez@example.com', role: 'user', phone: '+1 555-0198' }
];

const bulkOrganizations = [
  {
    name: 'City Central General Hospital & Emergency Center',
    type: 'Hospital',
    email: 'contact@citycentralhospital.org',
    phone: '+1 555-0100',
    address: '100 Health Blvd, Metro City',
    isPartner: true,
    allowAppBooking: true,
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics', 'Surgical Care'],
    location: { type: 'Point', coordinates: [-74.0060, 40.7128], formattedAddress: '100 Health Blvd, Metro City' },
    reviews: [
      { patientName: 'Sarah Jenkins', rating: 5, comment: 'Outstanding emergency care! The cardiologist was attentive and the app booking saved us hours.', visitDate: '2026-08-15' },
      { patientName: 'Michael Chen', rating: 4, comment: 'Very clean facilities and professional nursing staff. Easy check-in through MediGuide.', visitDate: '2026-08-20' },
      { patientName: 'Ayesha Khan', rating: 5, comment: 'Pediatric care department was compassionate with my daughter. Highly recommended partner hospital!', visitDate: '2026-09-01' }
    ]
  },
  {
    name: 'St. Jude Specialized Medical & Skin Clinic',
    type: 'Clinic',
    email: 'appointments@stjudeclinic.org',
    phone: '+1 555-0111',
    address: '45 Avenue B, Midtown',
    isPartner: true,
    allowAppBooking: true,
    services: ['Dermatology', 'General Practice', 'Allergy Testing', 'Vaccinations'],
    location: { type: 'Point', coordinates: [-74.0020, 40.7150], formattedAddress: '45 Avenue B, Midtown' },
    reviews: [
      { patientName: 'Elena Rostova', rating: 5, comment: 'Dr. St. Jude resolved my eczema reaction in 2 days. Seamless app appointment booking!', visitDate: '2026-08-10' },
      { patientName: 'David Miller', rating: 4, comment: 'Short wait time, friendly receptionist, thorough dermatology screening.', visitDate: '2026-08-28' }
    ]
  },
  {
    name: 'Apex Heart & Vascular Specialty Institute',
    type: 'Hospital',
    email: 'info@apexheartinstitute.com',
    phone: '+1 555-0155',
    address: '500 Medical Center Way, Cardiology Wing',
    isPartner: true,
    allowAppBooking: true,
    services: ['Cardiac Surgery', 'ECG & Echo', 'Angioplasty', 'Hypertension Management'],
    location: { type: 'Point', coordinates: [-74.0010, 40.7250], formattedAddress: '500 Medical Center Way' },
    reviews: [
      { patientName: 'James Wilson', rating: 5, comment: 'Top-tier cardiology specialists. The AI triage directed me here and it was spot on.', visitDate: '2026-08-05' },
      { patientName: 'Priya Sharma', rating: 5, comment: 'State-of-the-art heart monitoring facilities. Very grateful for the quick response.', visitDate: '2026-08-22' }
    ]
  },
  {
    name: 'Metro Advanced MRI & Diagnostic Center',
    type: 'Diagnostic Center',
    email: 'help@metrodiagnostics.com',
    phone: '+1 555-0133',
    address: '88 Science Park Dr, Tech District',
    isPartner: true,
    allowAppBooking: true,
    services: ['MRI 3T', 'CT Scan', 'Ultrasound', 'Blood Lab Analysis'],
    location: { type: 'Point', coordinates: [-73.9980, 40.7200], formattedAddress: '88 Science Park Dr' },
    reviews: [
      { patientName: 'Carlos Rodriguez', rating: 4, comment: 'Quick lab report turnaround time. Got digital results uploaded directly to my MediGuide profile.', visitDate: '2026-08-18' }
    ]
  },
  {
    name: 'Hope Children & Family Urgent Care Clinic',
    type: 'Clinic',
    email: 'care@hopefamilyclinic.org',
    phone: '+1 555-0188',
    address: '22 Elm Street, Residential West',
    isPartner: true,
    allowAppBooking: true,
    services: ['Urgent Care', 'Pediatrics', 'Flu Shots', 'Minor Wound Suture'],
    location: { type: 'Point', coordinates: [-74.0120, 40.7080], formattedAddress: '22 Elm Street' },
    reviews: [
      { patientName: 'Sarah Jenkins', rating: 5, comment: 'Wonderful pediatricians. They took care of my son fever late in the evening without delay.', visitDate: '2026-09-02' }
    ]
  }
];

const seedBulkData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediguide';
    await mongoose.connect(mongoUri);
    console.log('🌱 Connected to MongoDB for Bulk Data Seeding...');

    // Clear existing sample organizations & recreate with rich app reviews
    await Organization.deleteMany({});
    console.log('🧹 Cleared previous organization records.');

    for (const orgData of bulkOrganizations) {
      const avg = orgData.reviews.reduce((acc, r) => acc + r.rating, 0) / orgData.reviews.length;
      await Organization.create({
        ...orgData,
        averageRating: parseFloat(avg.toFixed(1)),
        totalReviews: orgData.reviews.length
      });
    }

    console.log(`✅ Successfully seeded ${bulkOrganizations.length} Registered Partner Organizations with Verified Patient Reviews!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedBulkData();
}

module.exports = { bulkOrganizations, seedBulkData };

const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sampleUsers = [
  {
    name: 'System Administrator',
    email: 'admin@mediguide.com',
    password: 'adminpassword123',
    role: 'admin',
    phone: '+92 51-111000111'
  },
  {
    name: 'Jane Patient (Standard User)',
    email: 'user@mediguide.com',
    password: 'userpassword123',
    role: 'user',
    phone: '+92 300-1234567',
    address: 'Sector F-7/2, Islamabad, Pakistan',
    medicalProfile: {
      bloodGroup: 'O+',
      gender: 'Female',
      dateOfBirth: '1995-04-15',
      allergies: ['Penicillin'],
      preExistingConditions: ['Asthma'],
      emergencyContact: {
        name: 'Sarah Smith',
        relationship: 'Sister',
        phone: '+92 300-7654321'
      }
    }
  },
  {
    name: 'Shifa Health Partner Org',
    email: 'org@mediguide.com',
    password: 'orgpassword123',
    role: 'organization',
    phone: '+92 51-8463000',
    address: 'Sector H-8/4, Islamabad, Pakistan'
  }
];

const sampleOrganizations = [
  {
    name: 'Shifa International Medical Center & Emergency',
    type: 'Hospital',
    email: 'contact@shifainternational.org',
    phone: '+92 51-8463000',
    address: 'Sector H-8/4, Islamabad',
    rating: 4.9,
    averageRating: 4.9,
    totalReviews: 3,
    isPartner: true,
    allowAppBooking: true,
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics'],
    location: {
      type: 'Point',
      coordinates: [73.0519, 33.6874], // [lng, lat] Islamabad H-8
      formattedAddress: 'Sector H-8/4, Islamabad'
    },
    reviews: [
      { patientName: 'Ahmad Hassan', rating: 5, comment: 'Outstanding emergency care! The cardiologist was attentive and app booking saved us hours.', visitDate: '2026-08-15' },
      { patientName: 'Fatima Zahra', rating: 5, comment: 'Pediatric care department was compassionate with my daughter. Highly recommended partner hospital!', visitDate: '2026-09-01' }
    ]
  },
  {
    name: 'Maroof International Hospital & Dermatology Center',
    type: 'Clinic',
    email: 'info@maroofhospital.com',
    phone: '+92 51-2222920',
    address: 'F-10 Markaz, Islamabad',
    rating: 4.7,
    averageRating: 4.7,
    totalReviews: 2,
    isPartner: true,
    allowAppBooking: true,
    services: ['General Practice', 'Dermatology', 'Vaccinations'],
    location: {
      type: 'Point',
      coordinates: [73.0429, 33.6904], // [lng, lat] Islamabad F-10
      formattedAddress: 'F-10 Markaz, Islamabad'
    },
    reviews: [
      { patientName: 'Usman Ali', rating: 5, comment: 'Short wait time, friendly receptionist, thorough dermatology screening.', visitDate: '2026-08-28' }
    ]
  },
  {
    name: 'Kulsum International Specialist Clinic',
    type: 'Hospital',
    email: 'care@kulsumhospital.com',
    phone: '+92 51-2276711',
    address: 'Blue Area, Islamabad',
    rating: 4.8,
    averageRating: 4.8,
    totalReviews: 2,
    isPartner: true,
    allowAppBooking: true,
    services: ['Cardiac Surgery', 'Angioplasty', 'ECG'],
    location: {
      type: 'Point',
      coordinates: [73.0549, 33.6804], // [lng, lat] Blue Area
      formattedAddress: 'Blue Area, Islamabad'
    },
    reviews: [
      { patientName: 'Zainab Bibi', rating: 5, comment: 'Top-tier cardiology specialists. The AI triage directed me here and it was spot on.', visitDate: '2026-08-05' }
    ]
  },
  {
    name: 'Metropolitan MRI & Diagnostic Center',
    type: 'Diagnostic Center',
    email: 'help@metromri.com',
    phone: '+92 51-4433221',
    address: 'G-8 Markaz, Islamabad',
    rating: 4.6,
    averageRating: 4.6,
    totalReviews: 1,
    isPartner: true,
    allowAppBooking: true,
    services: ['MRI 3T', 'CT Scan', 'X-Ray', 'Blood Analysis'],
    location: {
      type: 'Point',
      coordinates: [73.0449, 33.6794], // [lng, lat] G-8 Markaz
      formattedAddress: 'G-8 Markaz, Islamabad'
    },
    reviews: [
      { patientName: 'Hamza Malik', rating: 4, comment: 'Quick lab report turnaround time. Got digital results uploaded directly to my MediGuide profile.', visitDate: '2026-08-18' }
    ]
  }
];

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing from environment file.');
    }

    console.log(`🌐 Connecting to MongoDB Atlas Cluster...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas successfully!');

    console.log('🧹 Clearing existing Users and Organizations in Atlas DB...');
    await User.deleteMany({});
    await Organization.deleteMany({});

    console.log('👤 Seeding Admin, Standard Patient, and Organization Users...');
    for (const u of sampleUsers) {
      await User.create(u);
    }
    console.log(`✅ Seeded ${sampleUsers.length} accounts (Admin, Patient, Organization)!`);

    console.log('🏥 Seeding Healthcare Organizations with GeoJSON coordinates...');
    for (const org of sampleOrganizations) {
      await Organization.create(org);
    }
    console.log(`✅ Seeded ${sampleOrganizations.length} Partner Organizations!`);

    console.log('\n================ ATLAS DB SEED COMPLETE ================');
    console.log('Accounts Seeded:');
    console.log('  Primary Admin: admin@mediguide.com | adminpassword123');
    console.log('  Standard User: user@mediguide.com  | userpassword123');
    console.log('  Organization:  org@mediguide.com   | orgpassword123');
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding Failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();

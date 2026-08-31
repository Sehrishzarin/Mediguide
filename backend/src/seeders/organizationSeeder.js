const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');

dotenv.config();

const sampleUsers = [
  {
    name: 'System Admin',
    email: 'admin@mediguide.com',
    password: 'adminpassword123',
    role: 'admin',
    phone: '+1 800-555-0199'
  },
  {
    name: 'Jane Doe (Standard User)',
    email: 'user@mediguide.com',
    password: 'userpassword123',
    role: 'user',
    phone: '+1 555-0143'
  }
];

const sampleOrganizations = [
  {
    name: 'City Central General Hospital',
    type: 'Hospital',
    email: 'info@citycentralhospital.org',
    phone: '+1 555-0100',
    address: '100 Health Blvd, Metro City',
    rating: 4.8,
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics'],
    location: {
      type: 'Point',
      coordinates: [-74.0060, 40.7128], // [lng, lat] (New York Metro area)
      formattedAddress: '100 Health Blvd, Metro City'
    }
  },
  {
    name: 'St. Mary Specialized Clinic',
    type: 'Clinic',
    email: 'contact@stmaryclinic.org',
    phone: '+1 555-0111',
    address: '45 Avenue B, Midtown',
    rating: 4.6,
    services: ['General Practice', 'Dermatology', 'Vaccinations'],
    location: {
      type: 'Point',
      coordinates: [-74.0020, 40.7150],
      formattedAddress: '45 Avenue B, Midtown'
    }
  },
  {
    name: 'MediPlus 24/7 Pharmacy',
    type: 'Pharmacy',
    email: 'orders@medipluspharmacy.com',
    phone: '+1 555-0122',
    address: '12 Main Street, Downtown',
    rating: 4.9,
    services: ['Prescription Fulfillment', 'Home Delivery', 'OTC Drugs'],
    location: {
      type: 'Point',
      coordinates: [-74.0090, 40.7110],
      formattedAddress: '12 Main Street, Downtown'
    }
  },
  {
    name: 'Metro Advanced Diagnostic Center',
    type: 'Diagnostic Center',
    email: 'help@metrodiagnostics.com',
    phone: '+1 555-0133',
    address: '88 Science Park Dr, Tech District',
    rating: 4.7,
    services: ['MRI', 'CT Scan', 'X-Ray', 'Blood Analysis'],
    location: {
      type: 'Point',
      coordinates: [-73.9980, 40.7200],
      formattedAddress: '88 Science Park Dr, Tech District'
    }
  },
  {
    name: 'Sunrise Children Health Clinic',
    type: 'Clinic',
    email: 'care@sunrisepediatrics.com',
    phone: '+1 555-0144',
    address: '302 Park Avenue, Northside',
    rating: 4.9,
    services: ['Pediatrics', 'Child Psychology', 'Immunization'],
    location: {
      type: 'Point',
      coordinates: [-74.0150, 40.7080],
      formattedAddress: '302 Park Avenue, Northside'
    }
  },
  {
    name: 'Apex Heart & Vascular Institute',
    type: 'Hospital',
    email: 'appointments@apexheart.org',
    phone: '+1 555-0155',
    address: '500 Medical Center Way',
    rating: 4.9,
    services: ['Cardiac Surgery', 'Angioplasty', 'ECG'],
    location: {
      type: 'Point',
      coordinates: [-74.0010, 40.7250],
      formattedAddress: '500 Medical Center Way'
    }
  },
  {
    name: 'CareFirst Community Pharmacy',
    type: 'Pharmacy',
    email: 'support@carefirstrx.com',
    phone: '+1 555-0166',
    address: '77 Elm Street, Westside',
    rating: 4.5,
    services: ['Compounding', 'Vaccine Clinic', 'Diabetes Care'],
    location: {
      type: 'Point',
      coordinates: [-74.0200, 40.7100],
      formattedAddress: '77 Elm Street, Westside'
    }
  }
];

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediguide';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing Users and Organizations...');
    await User.deleteMany();
    await Organization.deleteMany();

    console.log('Seeding Primary Admin and Standard Users...');
    const createdUsers = await User.create(sampleUsers);
    console.log(`Created ${createdUsers.length} users successfully.`);

    console.log('Seeding Healthcare Organizations with GeoJSON coordinates...');
    const createdOrgs = await Organization.create(sampleOrganizations);
    console.log(`Created ${createdOrgs.length} organizations with 2DSphere location data!`);

    console.log('\n================ SEED COMPLETE ================');
    console.log('Sample Accounts Created:');
    console.log('  Admin: admin@mediguide.com | Password: adminpassword123');
    console.log('  User:  user@mediguide.com  | Password: userpassword123');
    console.log('================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`Seeding Failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();

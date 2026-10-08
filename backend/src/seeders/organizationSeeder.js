// Seeds demo accounts, partner organisations, public facilities and bookable sessions.
//   npm run seed
// Users are upserted by email (passwords reset to the demo values below);
// organisations and sessions are rebuilt from scratch.
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Not fatal
}

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Slot = require('../models/Slot');
const File = require('../models/File');
const { generateSlotsForDoctor } = require('../utils/slots');

const demoUsers = [
  {
    name: 'System Administrator',
    email: 'admin@mediguide.com',
    password: 'adminpassword123',
    role: 'admin',
    phone: '+92 51 1110001',
    onboardingCompleted: true
  },
  {
    name: 'Jane Patient',
    email: 'user@mediguide.com',
    password: 'userpassword123',
    role: 'user',
    phone: '+92 300 1234567',
    address: 'Sector F-7/2, Islamabad, Pakistan',
    onboardingCompleted: true,
    medicalProfile: {
      bloodGroup: 'O+',
      gender: 'Female',
      dateOfBirth: '1995-04-15',
      pregnancyStatus: 'N/A',
      height: 165,
      weight: 62,
      allergies: ['Penicillin'],
      preExistingConditions: ['Asthma'],
      currentMedications: [{ name: 'Albuterol inhaler', dosage: '2 puffs', frequency: 'As needed' }],
      emergencyContact: { name: 'Sarah Smith', relationship: 'Sister', phone: '+92 300 7654321' }
    }
  },
  {
    name: 'Margalla Heights Admin',
    email: 'org@mediguide.com',
    password: 'orgpassword123',
    role: 'organization',
    phone: '+92 51 8463000',
    address: 'Sector F-7, Islamabad, Pakistan',
    onboardingCompleted: true
  }
];

// Fictional partner organisations (demo data) placed around Islamabad. Coordinates are [lng, lat].
const partners = [
  {
    name: 'Margalla Heights Medical Center',
    type: 'Hospital',
    email: 'contact@margallaheights.example',
    phone: '+92 51 8463000',
    address: 'Sector F-7 Markaz, Islamabad',
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics'],
    coords: [73.0551, 33.7215],
    ownerEmail: 'org@mediguide.com',
    staff: [
      { name: 'Dr. Ayesha Malik', specialty: 'Cardiologist' },
      { name: 'Dr. Hamza Qureshi', specialty: 'General Physician' },
      { name: 'Dr. Sana Farooq', specialty: 'Pediatrician' }
    ],
    reviews: [
      { patientName: 'Ahmad H.', rating: 5, comment: 'Quick emergency triage and a very attentive cardiologist.' },
      { patientName: 'Fatima Z.', rating: 5, comment: 'Booking through the app saved us hours of waiting.' }
    ]
  },
  {
    name: 'Blue Area Family Clinic',
    type: 'Clinic',
    email: 'info@bluearea-clinic.example',
    phone: '+92 51 2222920',
    address: 'Blue Area, Islamabad',
    services: ['General Practice', 'Dermatology', 'Vaccinations'],
    coords: [73.0916, 33.7073],
    staff: [
      { name: 'Dr. Usman Raza', specialty: 'General Physician' },
      { name: 'Dr. Mehwish Ali', specialty: 'Dermatologist' }
    ],
    reviews: [
      { patientName: 'Usman A.', rating: 5, comment: 'Short wait, friendly staff and a thorough skin check.' }
    ]
  },
  {
    name: 'Capital Heart & Diagnostics',
    type: 'Hospital',
    email: 'care@capitalheart.example',
    phone: '+92 51 2276711',
    address: 'G-9 Markaz, Islamabad',
    services: ['Cardiac Surgery', 'ECG', 'Angiography'],
    coords: [73.0337, 33.6918],
    staff: [
      { name: 'Dr. Imran Siddiqui', specialty: 'Cardiologist' },
      { name: 'Dr. Noor Bukhari', specialty: 'Gastroenterologist' }
    ],
    reviews: [
      { patientName: 'Zainab B.', rating: 5, comment: 'Top cardiology team. The triage advice pointed me to the right place.' },
      { patientName: 'Bilal K.', rating: 4, comment: 'Clean, well organised, results were explained clearly.' }
    ]
  },
  {
    name: 'Metro Imaging & Lab Center',
    type: 'Diagnostic Center',
    email: 'help@metroimaging.example',
    phone: '+92 51 4433221',
    address: 'G-8 Markaz, Islamabad',
    services: ['MRI', 'CT Scan', 'X-Ray', 'Blood Analysis'],
    coords: [73.0449, 33.6794],
    staff: [{ name: 'Dr. Hira Javed', specialty: 'Orthopedist' }],
    reviews: [
      { patientName: 'Hamza M.', rating: 4, comment: 'Fast lab turnaround and easy parking.' }
    ]
  }
];

// Real public facilities in Islamabad (approximate coordinates). Not bookable in the app.
const publicFacilities = [
  { name: 'PIMS Hospital', type: 'Hospital', phone: '+92 51 9260000', address: 'G-8/3, Islamabad', services: ['Emergency Room', 'Outpatient Clinic', 'Pharmacy'], coords: [73.0522, 33.7052], publicRating: 4.0, publicReviewsCount: 0 },
  { name: 'Federal Government Polyclinic Hospital', type: 'Hospital', phone: '+92 51 9218300', address: 'G-6/2, Islamabad', services: ['Urgent Care', 'General Checkup', 'Vaccines'], coords: [73.0786, 33.7119], publicRating: 0, publicReviewsCount: 0 },
  { name: 'Ali Medical Centre', type: 'Hospital', phone: '+92 51 111 254 111', address: 'F-8 Markaz, Islamabad', services: ['24/7 Trauma Unit', 'ICU', 'Ambulance Service'], coords: [73.0372, 33.7181], publicRating: 0, publicReviewsCount: 0 }
];

const seed = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from backend/.env');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Users: upsert so real sign-ups are never wiped
    const usersByEmail = {};
    for (const data of demoUsers) {
      let user = await User.findOne({ email: data.email });
      if (user) {
        Object.assign(user, data);
      } else {
        user = new User(data);
      }
      await user.save();
      usersByEmail[data.email] = user;
    }
    console.log(`Upserted ${demoUsers.length} demo accounts`);

    // Organisations + sessions are rebuilt
    await Slot.deleteMany({});
    await File.deleteMany({ kind: 'org-document' });
    await Organization.deleteMany({});

    for (const p of partners) {
      const reviews = (p.reviews || []).map((r) => ({ ...r, visitDate: new Date().toISOString().split('T')[0] }));
      const org = await Organization.create({
        name: p.name,
        type: p.type,
        email: p.email,
        phone: p.phone,
        address: p.address,
        services: p.services,
        isPartner: true,
        allowAppBooking: true,
        status: 'approved',
        owner: p.ownerEmail ? usersByEmail[p.ownerEmail]._id : undefined,
        staff: p.staff,
        reviews,
        totalReviews: reviews.length,
        averageRating: reviews.length
          ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
          : 0,
        location: { type: 'Point', coordinates: p.coords, formattedAddress: p.address }
      });
      for (const doctor of org.staff) await generateSlotsForDoctor(org, doctor);
    }

    for (const f of publicFacilities) {
      await Organization.create({
        name: f.name,
        type: f.type,
        phone: f.phone,
        address: f.address,
        services: f.services,
        isPartner: false,
        allowAppBooking: false,
        status: 'approved',
        publicRating: f.publicRating,
        publicReviewsCount: f.publicReviewsCount,
        location: { type: 'Point', coordinates: f.coords, formattedAddress: f.address }
      });
    }

    const slotCount = await Slot.countDocuments();
    console.log(`Seeded ${partners.length} partners, ${publicFacilities.length} public facilities, ${slotCount} sessions`);
    console.log('\nDemo logins:');
    demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seed();

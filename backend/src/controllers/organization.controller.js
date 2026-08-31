const Organization = require('../models/Organization');

const fallbackOrganizations = [
  {
    _id: 'org1',
    name: 'City Central General Hospital',
    type: 'Hospital',
    email: 'info@citycentralhospital.org',
    phone: '+1 555-0100',
    address: '100 Health Blvd, Metro City',
    rating: 4.8,
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics'],
    location: { type: 'Point', coordinates: [-74.0060, 40.7128] }
  },
  {
    _id: 'org2',
    name: 'St. Mary Specialized Clinic',
    type: 'Clinic',
    email: 'contact@stmaryclinic.org',
    phone: '+1 555-0111',
    address: '45 Avenue B, Midtown',
    rating: 4.6,
    services: ['General Practice', 'Dermatology', 'Vaccinations'],
    location: { type: 'Point', coordinates: [-74.0020, 40.7150] }
  },
  {
    _id: 'org3',
    name: 'MediPlus 24/7 Pharmacy',
    type: 'Pharmacy',
    email: 'orders@medipluspharmacy.com',
    phone: '+1 555-0122',
    address: '12 Main Street, Downtown',
    rating: 4.9,
    services: ['Prescription Fulfillment', 'Home Delivery', 'OTC Drugs'],
    location: { type: 'Point', coordinates: [-74.0090, 40.7110] }
  },
  {
    _id: 'org4',
    name: 'Metro Advanced Diagnostic Center',
    type: 'Diagnostic Center',
    email: 'help@metrodiagnostics.com',
    phone: '+1 555-0133',
    address: '88 Science Park Dr, Tech District',
    rating: 4.7,
    services: ['MRI', 'CT Scan', 'X-Ray', 'Blood Analysis'],
    location: { type: 'Point', coordinates: [-73.9980, 40.7200] }
  },
  {
    _id: 'org5',
    name: 'Apex Heart & Vascular Institute',
    type: 'Hospital',
    email: 'appointments@apexheart.org',
    phone: '+1 555-0155',
    address: '500 Medical Center Way',
    rating: 4.9,
    services: ['Cardiac Surgery', 'Angioplasty', 'ECG'],
    location: { type: 'Point', coordinates: [-74.0010, 40.7250] }
  }
];

// @desc    Get all organizations (with optional filtering)
// @route   GET /api/organizations
// @access  Public
exports.getAllOrganizations = async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = {};

    if (type) {
      query.type = type;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let organizations = [];
    try {
      organizations = await Organization.find(query);
    } catch (dbErr) {
      // Fallback if MongoDB is not active locally
      organizations = fallbackOrganizations.filter(org => {
        if (type && org.type !== type) return false;
        if (search && !org.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    if (organizations.length === 0 && !type && !search) {
      organizations = fallbackOrganizations;
    }

    res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get organizations within a radius (Geospatial MongoDB Query for Maps)
// @route   GET /api/organizations/nearby?lat=...&lng=...&distance=...
// @access  Public
exports.getNearbyOrganizations = async (req, res) => {
  try {
    const { lat, lng, distance = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude (lat) and longitude (lng)'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInKm = parseFloat(distance);

    let organizations = [];
    try {
      const radius = radiusInKm / 6378.1;
      organizations = await Organization.find({
        location: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radius]
          }
        }
      });
    } catch (dbErr) {
      organizations = fallbackOrganizations;
    }

    res.status(200).json({
      success: true,
      count: organizations.length,
      data: organizations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private (Admin & Organization roles)
exports.createOrganization = async (req, res) => {
  try {
    const { name, type, address, phone, email, rating, services, longitude, latitude } = req.body;

    const organization = await Organization.create({
      name,
      type,
      address,
      phone,
      email,
      rating,
      services,
      user: req.user ? req.user.id : null,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude || -74.006), parseFloat(latitude || 40.7128)],
        formattedAddress: address
      }
    });

    res.status(201).json({
      success: true,
      data: organization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

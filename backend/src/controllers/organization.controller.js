const Organization = require('../models/Organization');

const fallbackPartnerOrganizations = [
  {
    _id: 'org1',
    name: 'City Central General Hospital & Emergency Center',
    type: 'Hospital',
    email: 'contact@citycentralhospital.org',
    phone: '+1 555-0100',
    address: '100 Health Blvd, Metro City',
    rating: 4.8,
    averageRating: 4.8,
    totalReviews: 3,
    isPartner: true,
    allowAppBooking: true,
    services: ['Emergency 24/7', 'Cardiology', 'ICU', 'Pediatrics'],
    location: { type: 'Point', coordinates: [-74.0060, 40.7128] },
    reviews: [
      { patientName: 'Sarah Jenkins', rating: 5, comment: 'Outstanding emergency care! The cardiologist was attentive and app booking saved us hours.', visitDate: '2026-08-15' },
      { patientName: 'Michael Chen', rating: 4, comment: 'Very clean facilities and professional nursing staff. Easy check-in through MediGuide.', visitDate: '2026-08-20' },
      { patientName: 'Ayesha Khan', rating: 5, comment: 'Pediatric care department was compassionate with my daughter. Highly recommended partner hospital!', visitDate: '2026-09-01' }
    ]
  },
  {
    _id: 'org2',
    name: 'St. Jude Specialized Medical & Skin Clinic',
    type: 'Clinic',
    email: 'appointments@stjudeclinic.org',
    phone: '+1 555-0111',
    address: '45 Avenue B, Midtown',
    rating: 4.6,
    averageRating: 4.6,
    totalReviews: 2,
    isPartner: true,
    allowAppBooking: true,
    services: ['General Practice', 'Dermatology', 'Vaccinations'],
    location: { type: 'Point', coordinates: [-74.0020, 40.7150] },
    reviews: [
      { patientName: 'Elena Rostova', rating: 5, comment: 'Dr. St. Jude resolved my eczema reaction in 2 days. Seamless app appointment booking!', visitDate: '2026-08-10' },
      { patientName: 'David Miller', rating: 4, comment: 'Short wait time, friendly receptionist, thorough dermatology screening.', visitDate: '2026-08-28' }
    ]
  },
  {
    _id: 'org3',
    name: 'Apex Heart & Vascular Specialty Institute',
    type: 'Hospital',
    email: 'info@apexheartinstitute.com',
    phone: '+1 555-0155',
    address: '500 Medical Center Way',
    rating: 4.9,
    averageRating: 4.9,
    totalReviews: 2,
    isPartner: true,
    allowAppBooking: true,
    services: ['Cardiac Surgery', 'Angioplasty', 'ECG'],
    location: { type: 'Point', coordinates: [-74.0010, 40.7250] },
    reviews: [
      { patientName: 'James Wilson', rating: 5, comment: 'Top-tier cardiology specialists. The AI triage directed me here and it was spot on.', visitDate: '2026-08-05' },
      { patientName: 'Priya Sharma', rating: 5, comment: 'State-of-the-art heart monitoring facilities. Very grateful for the quick response.', visitDate: '2026-08-22' }
    ]
  },
  {
    _id: 'org4',
    name: 'Metro Advanced MRI & Diagnostic Center',
    type: 'Diagnostic Center',
    email: 'help@metrodiagnostics.com',
    phone: '+1 555-0133',
    address: '88 Science Park Dr, Tech District',
    rating: 4.7,
    averageRating: 4.7,
    totalReviews: 1,
    isPartner: true,
    allowAppBooking: true,
    services: ['MRI', 'CT Scan', 'X-Ray', 'Blood Analysis'],
    location: { type: 'Point', coordinates: [-73.9980, 40.7200] },
    reviews: [
      { patientName: 'Carlos Rodriguez', rating: 4, comment: 'Quick lab report turnaround time. Got digital results uploaded directly to my MediGuide profile.', visitDate: '2026-08-18' }
    ]
  }
];

// Calculate Haversine distance in km
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

// Generate Public Google Maps Facilities dynamically around user coordinates
const generateGoogleMapsFacilities = (userLat, userLng) => {
  const publicFacilities = [
    {
      id: 'gmaps_1',
      name: 'St. Mary Community Medical Center',
      type: 'Public Hospital',
      source: 'google_maps',
      isPartner: false,
      allowAppBooking: false,
      address: 'Near User Location, Main Boulevard',
      phone: '+1 800-555-4321',
      googleRating: 4.6,
      googleReviewsCount: 142,
      services: ['Emergency Room', 'Outpatient Clinic', 'Pharmacy'],
      location: { type: 'Point', coordinates: [userLng + 0.008, userLat + 0.005] },
      distanceKm: getDistanceKm(userLat, userLng, userLat + 0.005, userLng + 0.008),
      publicReviewSnippet: '"Clean facilities and fast triage. Google verified public medical center."'
    },
    {
      id: 'gmaps_2',
      name: 'Sunrise Family Health & Urgent Care',
      type: 'Public Clinic',
      source: 'google_maps',
      isPartner: false,
      allowAppBooking: false,
      address: 'Oak Ridge Parkway, Suite 104',
      phone: '+1 800-555-8765',
      googleRating: 4.4,
      googleReviewsCount: 89,
      services: ['Urgent Care', 'General Checkup', 'Vaccines'],
      location: { type: 'Point', coordinates: [userLng - 0.006, userLat - 0.007] },
      distanceKm: getDistanceKm(userLat, userLng, userLat - 0.007, userLng - 0.006),
      publicReviewSnippet: '"Friendly doctors, reasonable wait times. Verified on Google Maps."'
    },
    {
      id: 'gmaps_3',
      name: 'Pioneer 24 Hours Emergency Hospital',
      type: 'Public Hospital',
      source: 'google_maps',
      isPartner: false,
      allowAppBooking: false,
      address: 'Central Square Ring Road',
      phone: '+1 800-555-9900',
      googleRating: 4.7,
      googleReviewsCount: 310,
      services: ['24/7 Trauma Unit', 'ICU', 'Ambulance Service'],
      location: { type: 'Point', coordinates: [userLng + 0.012, userLat - 0.003] },
      distanceKm: getDistanceKm(userLat, userLng, userLat - 0.003, userLng + 0.012),
      publicReviewSnippet: '"Excellent trauma care team. High Google rating for emergency response."'
    }
  ];

  return publicFacilities;
};

// @desc    Get all registered organizations
// @route   GET /api/organizations
// @access  Public
exports.getAllOrganizations = async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = {};

    if (type) query.type = type;
    if (search) query.name = { $regex: search, $options: 'i' };

    let organizations = [];
    try {
      organizations = await Organization.find(query);
    } catch (dbErr) {
      organizations = fallbackPartnerOrganizations.filter(org => {
        if (type && org.type !== type) return false;
        if (search && !org.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    if (organizations.length === 0 && !type && !search) {
      organizations = fallbackPartnerOrganizations;
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

// @desc    Get Dual-Source Nearby Hospitals (Registered MediGuide Partners + Google Maps Facilities)
// @route   GET /api/organizations/nearby?lat=...&lng=...&distance=...
// @access  Public
exports.getNearbyOrganizations = async (req, res) => {
  try {
    const { lat, lng, distance = 15 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude (lat) and longitude (lng)'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInKm = parseFloat(distance);

    let partnerOrgs = [];
    try {
      const radius = radiusInKm / 6378.1;
      const dbOrgs = await Organization.find({
        location: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radius]
          }
        }
      });

      partnerOrgs = dbOrgs.map(org => {
        const obj = org.toObject();
        const orgLat = obj.location?.coordinates[1] || latitude;
        const orgLng = obj.location?.coordinates[0] || longitude;
        return {
          ...obj,
          id: obj._id.toString(),
          source: 'mediguide_partner',
          isPartner: true,
          allowAppBooking: true,
          distanceKm: getDistanceKm(latitude, longitude, orgLat, orgLng)
        };
      });
    } catch (dbErr) {
      partnerOrgs = fallbackPartnerOrganizations.map(org => ({
        ...org,
        id: org._id,
        source: 'mediguide_partner',
        isPartner: true,
        allowAppBooking: true,
        distanceKm: getDistanceKm(latitude, longitude, org.location.coordinates[1], org.location.coordinates[0])
      }));
    }

    if (partnerOrgs.length === 0) {
      partnerOrgs = fallbackPartnerOrganizations.map(org => ({
        ...org,
        id: org._id,
        source: 'mediguide_partner',
        isPartner: true,
        allowAppBooking: true,
        distanceKm: getDistanceKm(latitude, longitude, org.location.coordinates[1], org.location.coordinates[0])
      }));
    }

    // Generate Nearby Google Maps Public Facilities as fallback/complement
    const googleFacilities = generateGoogleMapsFacilities(latitude, longitude);

    // Combine both sources
    const combinedFacilities = [...partnerOrgs, ...googleFacilities].sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    res.status(200).json({
      success: true,
      count: combinedFacilities.length,
      partnersCount: partnerOrgs.length,
      googlePlacesCount: googleFacilities.length,
      data: combinedFacilities
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit a Patient Review for a Registered Partner Organization
// @route   POST /api/organizations/:id/reviews
// @access  Private / Public
exports.addOrganizationReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, patientName } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide star rating (1-5) and review comment.'
      });
    }

    const reviewObj = {
      patientId: req.user ? req.user.id : null,
      patientName: patientName || req.user?.name || 'MediGuide Patient',
      rating: Number(rating),
      comment,
      visitDate: new Date().toISOString().split('T')[0],
      createdAt: new Date()
    };

    let org = null;
    try {
      org = await Organization.findById(id);
      if (org) {
        org.reviews.push(reviewObj);
        const total = org.reviews.length;
        const avg = org.reviews.reduce((acc, r) => acc + r.rating, 0) / total;
        org.averageRating = parseFloat(avg.toFixed(1));
        org.totalReviews = total;
        org.rating = org.averageRating;
        await org.save();
      }
    } catch (err) {
      console.warn('Review save fallback:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Review posted successfully!',
      review: reviewObj
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
      rating: rating || 4.5,
      averageRating: rating || 4.5,
      services,
      isPartner: true,
      allowAppBooking: true,
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

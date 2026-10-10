const Organization = require('../models/Organization');
const Slot = require('../models/Slot');
const File = require('../models/File');
const { asyncHandler, HttpError } = require('../middlewares/error');
const { generateSlotsForDoctor, isoDate } = require('../utils/slots');

const ORG_TYPES = Organization.schema.path('type').enumValues;

// Haversine distance in km
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Shape sent to patients (no owner id, no staff internals)
const toPublic = (org, extra = {}) => {
  const o = org.toObject ? org.toObject() : org;
  return {
    id: String(o._id),
    name: o.name,
    type: o.type,
    email: o.email,
    phone: o.phone,
    address: o.address,
    services: o.services,
    isPartner: o.isPartner,
    allowAppBooking: o.isPartner && o.allowAppBooking,
    source: o.isPartner ? 'mediguide_partner' : 'public_facility',
    averageRating: o.averageRating,
    totalReviews: o.totalReviews,
    publicRating: o.publicRating,
    publicReviewsCount: o.publicReviewsCount,
    reviews: (o.reviews || []).slice(-10).reverse().map((r) => ({
      patientName: r.patientName, rating: r.rating, comment: r.comment, visitDate: r.visitDate
    })),
    location: o.location,
    ...extra
  };
};

// @route GET /api/organizations?type=&search=
exports.getAllOrganizations = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const query = { status: 'approved' };
  if (type) query.type = String(type);
  if (search) query.name = { $regex: escapeRegex(String(search)), $options: 'i' };

  const organizations = await Organization.find(query).sort({ name: 1 }).limit(100);
  res.json({ success: true, count: organizations.length, data: organizations.map((o) => toPublic(o)) });
});

// @route GET /api/organizations/nearby?lat=&lng=&limit=
// Returns the closest approved facilities (partners and public listings), nearest first.
exports.getNearbyOrganizations = asyncHandler(async (req, res) => {
  const latitude = parseFloat(req.query.lat);
  const longitude = parseFloat(req.query.lng);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new HttpError(400, 'Please provide valid latitude (lat) and longitude (lng).');
  }

  const orgs = await Organization.find({
    status: 'approved',
    location: { $near: { $geometry: { type: 'Point', coordinates: [longitude, latitude] } } }
  }).limit(limit);

  const data = orgs.map((org) => {
    const [lng, lat] = org.location.coordinates;
    return toPublic(org, { distanceKm: getDistanceKm(latitude, longitude, lat, lng) });
  });

  res.json({
    success: true,
    count: data.length,
    partnersCount: data.filter((d) => d.isPartner).length,
    publicCount: data.filter((d) => !d.isPartner).length,
    data
  });
});

// @route POST /api/organizations/:id/reviews   (signed-in patients, one review per organisation)
exports.addOrganizationReview = asyncHandler(async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Please choose a star rating from 1 to 5.');
  }
  if (!comment) throw new HttpError(400, 'Please write a short review comment.');

  const org = await Organization.findOne({ _id: req.params.id, status: 'approved', isPartner: true });
  if (!org) throw new HttpError(404, 'Organization not found.');

  if (org.reviews.some((r) => String(r.patientId) === String(req.user.id))) {
    throw new HttpError(409, 'You have already reviewed this organization.');
  }

  org.reviews.push({
    patientId: req.user.id,
    patientName: req.user.name,
    rating,
    comment,
    visitDate: new Date().toISOString().split('T')[0]
  });
  org.totalReviews = org.reviews.length;
  org.averageRating = parseFloat((org.reviews.reduce((s, r) => s + r.rating, 0) / org.totalReviews).toFixed(1));
  await org.save();

  res.status(201).json({ success: true, data: toPublic(org) });
});

// ---------------------------------------------------------------------------
// Organisation-owner endpoints
// ---------------------------------------------------------------------------

const ownOrgOrFail = async (req) => {
  const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
  const org = await Organization.findOne(filter);
  if (!org) throw new HttpError(404, 'Organization not found.');
  return org;
};

// @route GET /api/organizations/mine
exports.getMyOrganizations = asyncHandler(async (req, res) => {
  const orgs = await Organization.find({ owner: req.user.id }).sort({ createdAt: -1 });
  const ids = orgs.map((o) => o._id);
  const docs = await File.find({ organization: { $in: ids }, kind: 'org-document' })
    .select('filename size uploadedAt organization');
  res.json({
    success: true,
    data: orgs.map((o) => ({
      ...o.toObject(),
      id: String(o._id),
      documents: docs.filter((d) => String(d.organization) === String(o._id))
    }))
  });
});

// @route POST /api/organizations   (organisation / admin)
exports.createOrganization = asyncHandler(async (req, res) => {
  const { name, type, address, phone, email, services, longitude, latitude } = req.body;

  if (!name || !String(name).trim()) throw new HttpError(400, 'Organization name is required.');
  if (!address || !String(address).trim()) throw new HttpError(400, 'Organization address is required.');
  if (type && !ORG_TYPES.includes(type)) throw new HttpError(400, `Type must be one of: ${ORG_TYPES.join(', ')}.`);

  const lng = parseFloat(longitude);
  const lat = parseFloat(latitude);
  const hasCoords = Number.isFinite(lng) && Number.isFinite(lat);
  if (!hasCoords) throw new HttpError(400, 'Please set the facility location (latitude and longitude).');
  // Catch typos and swapped fields: latitude must be -85..85 (no poles), longitude -180..180, not 0,0
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    throw new HttpError(400, 'That location does not look right. Use "Use my current location", or check that latitude (e.g. 33.68) and longitude (e.g. 73.04) are not swapped.');
  }

  const isAdmin = req.user.role === 'admin';
  const organization = await Organization.create({
    name,
    type: type || 'Hospital',
    address,
    phone,
    email,
    services: Array.isArray(services) ? services.filter(Boolean) : [],
    isPartner: true,
    allowAppBooking: true,
    status: isAdmin ? 'approved' : 'pending',
    owner: req.user.id,
    location: { type: 'Point', coordinates: [lng, lat], formattedAddress: address }
  });

  res.status(201).json({ success: true, data: { ...organization.toObject(), id: String(organization._id) } });
});

// @route POST /api/organizations/:id/staff
exports.addStaff = asyncHandler(async (req, res) => {
  const org = await ownOrgOrFail(req);
  const name = String(req.body.name || '').trim();
  const specialty = String(req.body.specialty || 'General Physician').trim();
  if (!name) throw new HttpError(400, 'Staff member name is required.');

  org.staff.push({ name, specialty });
  await org.save();

  // Approved organisations get bookable sessions straight away
  if (org.status === 'approved') await generateSlotsForDoctor(org, { name, specialty });

  res.status(201).json({ success: true, data: org.staff });
});

// @route DELETE /api/organizations/:id/staff/:staffId
exports.removeStaff = asyncHandler(async (req, res) => {
  const org = await ownOrgOrFail(req);
  const member = org.staff.id(req.params.staffId);
  if (!member) throw new HttpError(404, 'Staff member not found.');
  const today = isoDate(new Date());
  // Only remove sessions nobody booked yet
  await Slot.deleteMany({ organization: org._id, doctor: member.name, patient: null, date: { $gte: today } });
  member.deleteOne();
  await org.save();
  res.json({ success: true, data: org.staff });
});

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

// @route GET /api/organizations/admin/pending
exports.getPendingOrganizations = asyncHandler(async (req, res) => {
  const orgs = await Organization.find({ status: 'pending' }).sort({ createdAt: 1 }).populate('owner', 'name email');
  const docs = await File.find({ organization: { $in: orgs.map((o) => o._id) }, kind: 'org-document' })
    .select('filename size uploadedAt organization');
  res.json({
    success: true,
    data: orgs.map((o) => ({
      ...o.toObject(),
      id: String(o._id),
      documents: docs.filter((d) => String(d.organization) === String(o._id))
    }))
  });
});

// @route PUT /api/organizations/:id/status   { status: 'approved' | 'rejected' }
exports.reviewOrganization = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new HttpError(400, 'Status must be "approved" or "rejected".');
  }
  const org = await Organization.findById(req.params.id);
  if (!org) throw new HttpError(404, 'Organization not found.');

  org.status = status;
  await org.save();

  if (status === 'approved') {
    for (const member of org.staff) await generateSlotsForDoctor(org, member);
  }

  res.json({ success: true, data: { id: String(org._id), status: org.status } });
});

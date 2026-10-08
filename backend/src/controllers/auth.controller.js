const User = require('../models/User');
const Slot = require('../models/Slot');
const File = require('../models/File');
const Organization = require('../models/Organization');
const { asyncHandler, HttpError } = require('../middlewares/error');

// Roles a person may pick for themselves at sign-up. Admin accounts are never self-served.
const SELF_SERVE_ROLES = ['user', 'organization'];

const sendTokenResponse = (user, statusCode, res) => {
  res.status(statusCode).json({
    success: true,
    token: user.getSignedJwtToken(),
    user: user.toClient()
  });
};

const MEDICAL_FIELDS = [
  'bloodGroup', 'gender', 'pregnancyStatus', 'dateOfBirth', 'height', 'weight',
  'allergies', 'preExistingConditions', 'currentMedications', 'longTermTreatments', 'notes'
];
const EMERGENCY_FIELDS = ['name', 'relationship', 'phone'];

// @route POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    throw new HttpError(400, 'Name, email and password are required.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters.');
  }

  const assignedRole = SELF_SERVE_ROLES.includes(role) ? role : 'user';

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new HttpError(409, 'An account with this email already exists.');

  const user = await User.create({
    name,
    email,
    password,
    role: assignedRole,
    phone: phone || ''
  });

  sendTokenResponse(user, 201, res);
});

// @route POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Please provide an email and password.');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  // Same message for unknown email and wrong password so accounts cannot be enumerated
  if (!user || !(await user.matchPassword(String(password)))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  sendTokenResponse(user, 200, res);
});

// @route GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toClient() });
});

// @route PUT /api/auth/profile
// Partial update: only the fields that are sent are changed.
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, onboardingCompleted, medicalProfile } = req.body;
  const $set = {};

  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, 'Name cannot be empty.');
    $set.name = name;
  }
  if (phone !== undefined) $set.phone = phone;
  if (address !== undefined) $set.address = address;
  if (onboardingCompleted !== undefined) $set.onboardingCompleted = Boolean(onboardingCompleted);

  if (medicalProfile && typeof medicalProfile === 'object') {
    for (const key of MEDICAL_FIELDS) {
      if (medicalProfile[key] !== undefined) $set[`medicalProfile.${key}`] = medicalProfile[key];
    }
    const ec = medicalProfile.emergencyContact;
    if (ec && typeof ec === 'object') {
      for (const key of EMERGENCY_FIELDS) {
        if (ec[key] !== undefined) $set[`medicalProfile.emergencyContact.${key}`] = ec[key];
      }
    }
  }

  if (Object.keys($set).length === 0) {
    return res.json({ success: true, data: req.user.toClient() });
  }

  const updated = await User.findByIdAndUpdate(req.user.id, { $set }, { new: true, runValidators: true });
  res.json({ success: true, data: updated.toClient() });
});

// @route PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'Current and new password are required.');
  }
  if (String(newPassword).length < 8) {
    throw new HttpError(400, 'New password must be at least 8 characters.');
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.matchPassword(String(currentPassword)))) {
    throw new HttpError(401, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();
  sendTokenResponse(user, 200, res);
});

// @route DELETE /api/auth/me
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw new HttpError(400, 'Please confirm your password to delete your account.');
  if (req.user.role === 'admin') throw new HttpError(403, 'Admin accounts cannot be deleted here.');

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.matchPassword(String(password)))) {
    throw new HttpError(401, 'Password is incorrect.');
  }

  // Release booked sessions, drop uploads and remove owned organisations
  await Slot.updateMany({ patient: user._id }, { $set: { patient: null, bookedAt: null } });
  const owned = await Organization.find({ owner: user._id }).select('_id');
  const ownedIds = owned.map((o) => o._id);
  await Slot.deleteMany({ organization: { $in: ownedIds } });
  await Organization.deleteMany({ owner: user._id });
  await File.deleteMany({ $or: [{ owner: user._id }, { organization: { $in: ownedIds } }] });
  await user.deleteOne();

  res.json({ success: true, message: 'Your account and data have been deleted.' });
});

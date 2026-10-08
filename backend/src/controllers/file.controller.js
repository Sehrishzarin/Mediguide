const File = require('../models/File');
const Organization = require('../models/Organization');
const { asyncHandler, HttpError } = require('../middlewares/error');

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILES_PER_USER = 25;

const toClient = (f) => ({
  id: String(f._id),
  filename: f.filename,
  mimeType: f.mimeType,
  size: f.size,
  kind: f.kind,
  organizationId: f.organization ? String(f.organization) : null,
  uploadedAt: f.uploadedAt
});

// @route POST /api/files   multipart: file, kind=report|org-document, organizationId?
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a file to upload.');
  if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
    throw new HttpError(400, 'Only PDF, PNG, JPG or WEBP files are allowed.');
  }

  const kind = req.body.kind === 'org-document' ? 'org-document' : 'report';
  let organization = null;

  if (kind === 'org-document') {
    if (req.user.role !== 'organization' && req.user.role !== 'admin') {
      throw new HttpError(403, 'Only organizations can upload verification documents.');
    }
    const org = await Organization.findOne({ _id: req.body.organizationId, owner: req.user.id });
    if (!org) throw new HttpError(404, 'Organization not found.');
    organization = org._id;
  }

  const count = await File.countDocuments({ owner: req.user.id });
  if (count >= MAX_FILES_PER_USER) {
    throw new HttpError(400, `You can store up to ${MAX_FILES_PER_USER} files. Delete one to add another.`);
  }

  const file = await File.create({
    owner: req.user.id,
    kind,
    organization,
    filename: req.file.originalname.slice(0, 120),
    mimeType: req.file.mimetype,
    size: req.file.size,
    data: req.file.buffer
  });

  res.status(201).json({ success: true, data: toClient(file) });
});

// @route GET /api/files?kind=report
exports.listFiles = asyncHandler(async (req, res) => {
  const kind = req.query.kind === 'org-document' ? 'org-document' : 'report';
  const files = await File.find({ owner: req.user.id, kind }).sort({ uploadedAt: -1 });
  res.json({ success: true, data: files.map(toClient) });
});

// Owner can always read; admins can read organisation verification documents
const findReadable = async (req) => {
  const file = await File.findById(req.params.id).select('+data');
  if (!file) throw new HttpError(404, 'File not found.');
  const isOwner = String(file.owner) === String(req.user.id);
  const adminReadsOrgDoc = req.user.role === 'admin' && file.kind === 'org-document';
  if (!isOwner && !adminReadsOrgDoc) throw new HttpError(404, 'File not found.');
  return file;
};

// @route GET /api/files/:id/download
exports.downloadFile = asyncHandler(async (req, res) => {
  const file = await findReadable(req);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.data);
});

// @route DELETE /api/files/:id
exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!file) throw new HttpError(404, 'File not found.');
  res.json({ success: true });
});

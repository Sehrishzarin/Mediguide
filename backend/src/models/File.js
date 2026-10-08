const mongoose = require('mongoose');

// Small uploaded documents (patient test reports, organisation verification docs)
const FileSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['report', 'org-document'], required: true },
  organization: { type: mongoose.Schema.ObjectId, ref: 'Organization', default: null, index: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true, select: false },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', FileSchema);

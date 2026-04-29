const mongoose = require('mongoose');

const researchSchema = new mongoose.Schema({
  title: { type: String, required: true },
  district: { type: String, required: true },
  province: { type: String, default: '' },
  description: { type: String, default: '' },
  fullContent: { type: String, default: '' },
  researcher: { type: String, default: '' },
  organization: { type: String, default: '' },
  links: [{ type: String }],
  relatedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  imageUrl: { type: String, default: '' },
  images: [{ type: String }], // Array of image paths
  pdfs: [{ type: String }],   // Array of PDF paths
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('Research', researchSchema);
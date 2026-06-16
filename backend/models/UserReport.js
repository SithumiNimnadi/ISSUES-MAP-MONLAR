const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  district: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  reporterName: { type: String, required: true },
  reporterEmail: { type: String, required: true },
  category: { type: String, default: 'Other' },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'approved', 'rejected'], 
    default: 'pending' 
  },
  adminNotes: { type: String },
  images: [String],
  createdAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: String
});

module.exports = mongoose.model('UserReport', userReportSchema);
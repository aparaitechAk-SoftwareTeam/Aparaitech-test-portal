const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  instructor: { type: String, trim: true, default: 'APARAITECH' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
  collegeName: { type: String, default: '' },
  fee: { type: Number, required: true, default: 0 },
  isFree: { type: Boolean, default: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, default: '10:00' },
  endTime: { type: String, default: '17:00' },
  venue: { type: String, trim: true, default: '' },
  maxSeats: { type: Number, default: 100 },
  enrolledCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  tags: [String],
  thumbnail: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Workshop', workshopSchema);

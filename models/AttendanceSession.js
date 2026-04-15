const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  workshopId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  sessionLabel: { type: String, required: true, trim: true },   // e.g. "Day 1 - Morning"
  token:        { type: String, required: true, unique: true }, // random 6-char code
  isOpen:       { type: Boolean, default: false },
  openedAt:     { type: Date, default: null },
  closedAt:     { type: Date, default: null },
  createdBy:    { type: String, default: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);

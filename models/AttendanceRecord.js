const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  workshopId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:  { type: String, default: '' },
  studentEmail: { type: String, default: '' },
  collegeName:  { type: String, default: '' },
  markedAt:     { type: Date, default: Date.now }
}, { timestamps: true });

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);

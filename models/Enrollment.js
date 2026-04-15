const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  studentName:  String,
  studentEmail: String,
  collegeName:  String,
  collegeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
  workshopTitle: String,
  fee: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'free', 'failed'], default: 'pending' },
  paymentId:    { type: String, default: '' },  // Razorpay payment ID
  orderId:      { type: String, default: '' },  // Razorpay order ID
  enrolledAt:   { type: Date, default: Date.now }
}, { timestamps: true });

enrollmentSchema.index({ workshopId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model('Enrollment', enrollmentSchema);

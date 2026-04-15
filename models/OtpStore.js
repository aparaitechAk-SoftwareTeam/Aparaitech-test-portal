/**
 * OTP Store Model
 * ===============
 * Temporarily stores OTPs for email-based login.
 * MongoDB TTL index auto-deletes expired OTPs.
 */

const mongoose = require('mongoose');

const otpStoreSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  expiry: {
    type: Date,
    required: true,
    // TTL index: MongoDB auto-removes document after expiry time
    index: { expires: 0 }
  },
  attempts: {
    type: Number,
    default: 0  // Track failed verification attempts
  }
}, {
  timestamps: true
});

// Compound index: one OTP per email at a time
otpStoreSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('OtpStore', otpStoreSchema);

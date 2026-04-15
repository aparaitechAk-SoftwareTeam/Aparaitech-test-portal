/**
 * Test Model
 * ==========
 * Stores test configurations created by admin.
 */

const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Test title is required'],
    trim: true
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    enum: ['Frontend', 'Backend', 'Database', 'Full Stack', 'DevOps', 'General'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration (in minutes) is required'],
    min: [5, 'Minimum duration is 5 minutes'],
    max: [180, 'Maximum duration is 180 minutes']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks required'],
    min: 1
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  questionLimit: {
    type: Number,
    default: 0, // 0 means use all questions
    min: 0
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  instructions: {
    type: String,
    default: ''
  },
  isScheduled: {
    type: Boolean,
    default: false   // false = open anytime (legacy behaviour)
  },
  scheduledStart: {
    type: Date,
    default: null    // null = no window enforced
  },
  scheduledEnd: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Test', testSchema);

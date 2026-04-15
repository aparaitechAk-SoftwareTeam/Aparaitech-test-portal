/**
 * Result Model
 * ============
 * Stores student test results with full answer details.
 */

const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  questionText: String,         // Snapshot of question text at time of attempt
  options: [String],            // Snapshot of shuffled options shown to student
  selectedOption: {
    type: Number,
    default: -1  // -1 means not answered
  },
  correctOption: Number,        // Correct answer index
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksAwarded: {
    type: Number,
    default: 0
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  studentName: String,
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null
  },
  collegeName: {
    type: String,
    default: ''
  },
  studentEmail: String,
  testTitle: String,
  testDomain: String,
  score: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  unattempted: {
    type: Number,
    default: 0
  },
  answers: [answerSchema],
  timeTaken: {
    type: Number,  // in seconds
    default: 0
  },
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  emailSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index: one result per student per test
resultSchema.index({ studentId: 1, testId: 1 });

module.exports = mongoose.model('Result', resultSchema);

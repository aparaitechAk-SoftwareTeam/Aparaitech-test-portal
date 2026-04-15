/**
 * Question Model
 * ==============
 * Stores MCQ questions linked to a test.
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 4,
      message: 'Exactly 4 options are required'
    }
  },
  correctAnswer: {
    type: Number,  // 0-indexed: 0=A, 1=B, 2=C, 3=D
    required: true,
    min: 0,
    max: 3
  },
  marks: {
    type: Number,
    default: 1  // marks per question
  },
  explanation: {
    type: String,
    default: ''  // Optional explanation for correct answer
  }
}, {
  timestamps: true
});

// Index for faster queries by testId
questionSchema.index({ testId: 1 });

module.exports = mongoose.model('Question', questionSchema);

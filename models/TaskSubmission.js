const mongoose = require('mongoose');

const taskSubmissionSchema = new mongoose.Schema({
  materialId:   { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial', required: true },
  workshopId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName:  String,
  studentEmail: String,
  submissionText: { type: String, default: '' },
  fileUrl:      { type: String, default: '' },
  status:       { type: String, enum: ['submitted', 'reviewed', 'approved', 'rejected'], default: 'submitted' },
  feedback:     { type: String, default: '' },
  grade:        { type: String, default: '' },
  submittedAt:  { type: Date, default: Date.now }
}, { timestamps: true });

taskSubmissionSchema.index({ materialId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model('TaskSubmission', taskSubmissionSchema);

const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  workshopId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  type:        { type: String, enum: ['notes', 'video', 'link', 'task'], default: 'notes' },
  content:     { type: String, default: '' },   // text notes or URL
  fileUrl:     { type: String, default: '' },   // uploaded file URL
  isTask:      { type: Boolean, default: false },
  taskDeadline: { type: Date, default: null },
  uploadedBy:  { type: String, default: 'Admin' },
  order:       { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);

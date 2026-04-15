const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null
  },
  collegeName: {
    type: String,
    trim: true,
    default: ''
  },
  mobile: {
    type: String,
    trim: true,
    default: '',
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);

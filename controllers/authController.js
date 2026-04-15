const User    = require('../models/User');
const College = require('../models/College');
const bcrypt = require('bcryptjs');

// ── GET /admin-login ──────────────────────────────────────
exports.getAdminLogin = (req, res) => {
  res.render('admin-login', { title: 'Admin Login — APARAITECH' });
};

// ── GET /login ─────────────────────────────────────────
exports.getLogin = async (req, res) => {
  try {
    const colleges = await College.find({ isActive: true }).sort({ name: 1 });
    res.render('login', { title: 'Login — APARAITECH Test Portal', colleges });
  } catch (err) {
    res.render('login', { title: 'Login — APARAITECH Test Portal', colleges: [] });
  }
};

// ── POST /login/register ───────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, collegeName, email, mobile, password, confirmPassword } = req.body;

    if (!name || !email || !password || !collegeName || !mobile) {
      req.flash('error_msg', 'All fields are required.');
      return res.redirect('/login');
    }

    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.redirect('/login');
    }

    if (password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters.');
      return res.redirect('/login');
    }

    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      req.flash('error_msg', 'Please enter a valid 10-digit mobile number.');
      return res.redirect('/login');
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      req.flash('error_msg', 'Email already registered. Please login.');
      return res.redirect('/login');
    }

    // Find college by name to get ID
    const college = await College.findOne({ name: collegeName.trim() });

    const user = new User({
      name: name.trim(),
      collegeName: college ? college.name : collegeName.trim(),
      collegeId: college ? college._id : null,
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password,
      role: 'student'
    });
    await user.save();

    req.flash('success_msg', 'Registration successful! Please login.');
    res.redirect('/login');

  } catch (err) {
    console.error('Register error:', err.message);
    req.flash('error_msg', 'Registration failed. Please try again.');
    res.redirect('/login');
  }
};

// ── POST /login/student ────────────────────────────────
exports.studentLogin = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password;

    if (!email || !password) {
      req.flash('error_msg', 'Email and password are required.');
      return res.redirect('/login');
    }

    const user = await User.findOne({ email, role: 'student' });
    if (!user || !user.password) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/login');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      collegeName: user.collegeName,
      role: 'student'
    };

    req.flash('success_msg', `Welcome back, ${user.name}!`);
    res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Student login error:', err.message);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
};

// ── POST /admin/login ──────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const password = req.body.password?.trim();

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      req.flash('error_msg', 'Invalid admin credentials.');
      return res.redirect('/login');
    }

    const admin = await User.findOneAndUpdate(
      { email },
      { email, role: 'admin', name: 'Administrator' },
      { upsert: true, new: true }
    );

    req.session.user = {
      _id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: 'admin'
    };

    req.flash('success_msg', 'Welcome, Admin!');
    res.redirect('/admin/dashboard');

  } catch (err) {
    console.error('Admin login error:', err.message);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
};

// ── GET /logout ────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

/**
 * Auth Middleware
 * ==============
 * Protects routes based on session or JWT tokens.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aparaitech_secret';

// ── Require logged-in user (student or admin) ─────────
function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page.');
  res.redirect('/login');
}

// ── Require admin role ────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin only.');
  res.redirect('/login');
}

// ── Require student role ──────────────────────────────
function requireStudent(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Students only.');
  res.redirect('/login');
}

// ── Already logged in redirect ────────────────────────
function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    return res.redirect(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  }
  next();
}

module.exports = { requireLogin, requireAdmin, requireStudent, redirectIfLoggedIn };

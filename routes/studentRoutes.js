/**
 * Student Routes
 * ==============
 */

const express = require('express');
const router  = express.Router();
const studentController = require('../controllers/studentController');
const { requireStudent } = require('../middleware/authMiddleware');

// All student routes require student session
router.use(requireStudent);

// ── Dashboard & Profile ───────────────────────────────
router.get('/dashboard',       studentController.getDashboard);
router.get('/profile',         studentController.getProfile);
router.post('/profile',        studentController.updateProfile);

// ── Test Flow ─────────────────────────────────────────
router.get('/enter-code',      studentController.getEnterCode);
router.post('/enter-code',     studentController.postEnterCode);
router.get('/test/:id/instructions', studentController.getInstructions);
router.get('/test/:id/start',  studentController.startTest);
router.post('/test/:id/submit', studentController.submitTest);

// ── Results ───────────────────────────────────────────
router.get('/results/:id',     studentController.getResult);
router.get('/results/:id/pdf', studentController.downloadResultPDF);

module.exports = router;

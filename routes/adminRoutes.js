/**
 * Admin Routes
 */

const express = require('express');
const router  = express.Router();
const adminController   = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAdmin);

// ── Dashboard ─────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ── Tests ─────────────────────────────────────────────
router.get('/tests',              adminController.getTests);
router.get('/tests/create',       adminController.getCreateTest);
router.post('/tests/create',      adminController.postCreateTest);
router.get('/tests/:id/edit',     adminController.getEditTest);
router.post('/tests/:id/edit',    adminController.postEditTest);
router.get('/tests/:id/toggle',   adminController.toggleTestStatus);
router.post('/tests/:id/delete',  adminController.deleteTest);

// ── Questions ─────────────────────────────────────────
router.get('/tests/:id/questions',   adminController.getAddQuestions);
router.post('/tests/:id/questions',  adminController.postAddQuestion);
router.get('/questions/:id/edit',    adminController.getEditQuestion);
router.post('/questions/:id/edit',   adminController.postEditQuestion);
router.post('/questions/:id/delete', adminController.deleteQuestion);

// ── Results (specific routes MUST come before /:id) ───
router.get('/results',              adminController.getAllResults);
router.get('/results/download',     adminController.downloadResults);
router.get('/results/topscores',    adminController.getTopScores);
router.get('/results/:id',          adminController.getResultDetail);
router.post('/results/:id/reset',   adminController.resetStudentTest);
router.get('/results/:id/pdf',      studentController.adminDownloadPDF);

// ── Colleges ──────────────────────────────────────────
router.get('/colleges',                    adminController.getColleges);
router.post('/colleges/add',               adminController.addCollege);
router.post('/colleges/:id/delete',        adminController.deleteCollege);
router.get('/colleges/:id/report',         adminController.getCollegeReport);
router.get('/colleges/:id/download',       adminController.downloadCollegeReport);

// ── Announcements ────────────────────────────────────
router.get('/announce',  adminController.getAnnounce);
router.post('/announce', adminController.postAnnounce);

// ── Users ─────────────────────────────────────────────
router.get('/users',                          adminController.getUsers);
router.post('/users/delete-all',              adminController.deleteAllUsers);   // MUST come before /:id
router.post('/users/:id/delete',              adminController.deleteUser);
router.post('/users/wa-template',             adminController.saveWaTemplate);
router.get('/users/wa-template',              adminController.getWaTemplate);

module.exports = router;

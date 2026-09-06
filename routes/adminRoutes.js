/**
 * Admin Routes
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const adminController   = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Multer: memory storage for Excel uploads (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Only .xlsx and .xls files are allowed.'));
  }
});

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
router.post('/tests/:id/import-questions', upload.single('questionsFile'), adminController.importQuestions);

// ── Question template download ────────────────────────
router.get('/questions/template', (req, res) => {
  const XLSX = require('xlsx');
  const sampleData = [
    { 'Question': 'What does HTML stand for?', 'Option A': 'HyperText Markup Language', 'Option B': 'HighText Machine Language', 'Option C': 'HyperText Machine Language', 'Option D': 'HyperText Markup Level', 'Correct Answer': 'A', 'Marks': 1, 'Explanation': 'HTML stands for HyperText Markup Language.' },
    { 'Question': 'Which is a JavaScript framework?', 'Option A': 'Django', 'Option B': 'Laravel', 'Option C': 'React', 'Option D': 'Flask', 'Correct Answer': 'C', 'Marks': 1, 'Explanation': 'React is a JavaScript library developed by Facebook.' }
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [{wch:45},{wch:25},{wch:25},{wch:25},{wch:25},{wch:16},{wch:8},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="questions-template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

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

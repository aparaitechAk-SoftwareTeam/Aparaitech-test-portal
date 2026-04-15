const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { redirectIfLoggedIn } = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  }
  res.redirect('/login');
});

router.get('/login',              redirectIfLoggedIn, authController.getLogin);
router.get('/admin-login',        redirectIfLoggedIn, authController.getAdminLogin);
router.post('/login/student',     redirectIfLoggedIn, authController.studentLogin);
router.post('/login/register',    redirectIfLoggedIn, authController.register);
router.post('/admin/login',       redirectIfLoggedIn, authController.adminLogin);
router.get('/logout',             authController.logout);

module.exports = router;

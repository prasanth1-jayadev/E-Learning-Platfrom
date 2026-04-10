const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, redirectIfAdmin } = require('../middleware/authMiddleware');

router.get('/login', redirectIfAdmin, adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

router.get('/dashboard', isAdmin, adminController.getDashboard);

router.get('/tutor-applications', isAdmin, adminController.getTutorApplications);
router.get('/tutors', isAdmin, adminController.getTutors);
router.post('/approve-tutor/:tutorId', isAdmin, adminController.approveTutor);
router.post('/reject-tutor/:tutorId', isAdmin, adminController.rejectTutor);
router.post('/toggle-block/:tutorId', isAdmin, adminController.toggleTutorBlock);


router.get('/students', isAdmin, adminController.getStudents);


router.get('/categories', isAdmin, (req, res) => 
  res.render('admin/categories', { currentPage: 'categories' })
);

router.get('/courses', isAdmin, (req, res) => 
  res.render('admin/courses', { currentPage: 'courses' })
);

router.get('/coupons', isAdmin, (req, res) => 
  res.render('admin/coupons', { currentPage: 'coupons' })
);

router.get('/sales-report', isAdmin, (req, res) => 
  res.render('admin/sales-report', { currentPage: 'sales-report' })
);

module.exports = router;
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
router.post('/toggle-student-block/:studentId', isAdmin, adminController.toggleStudentBlock);



module.exports = router;
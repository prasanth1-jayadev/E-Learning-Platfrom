import express from 'express';
import * as adminController from '../controllers/admin/adminController.js';
import * as categoryController from '../controllers/admin/categoryController.js';
import { isAdmin, redirectIfAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

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

router.get('/categories', isAdmin, categoryController.getCategories);
router.post('/categories/add', isAdmin, categoryController.addCategory);
router.post('/categories/:id/edit', isAdmin, categoryController.editCategory);
router.post('/categories/:id/toggle-status', isAdmin, categoryController.toggleStatus);

export default router;

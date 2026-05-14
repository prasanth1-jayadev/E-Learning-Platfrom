import express from 'express';
import { getTutorCourses } from '../controllers/tutor/tutorController.js';

const router = express.Router();

router.get('/tutor/courses', getTutorCourses);
router.get('/tutor/:id', tutorController.getTutorProfile);

export default router;

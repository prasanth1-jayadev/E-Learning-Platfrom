import express from 'express';
import { getTutorCourses } from '../controllers/tutor/tutorController.js';

const router = express.Router();

router.get('/tutor/courses', getTutorCourses);

export default router;

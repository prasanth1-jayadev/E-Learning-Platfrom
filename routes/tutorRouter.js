const express = require('express');
const router  = express.Router();
const tutorController = require('../controllers/tutorController');
const { isTutor, redirectIfTutor } = require('../middleware/authMiddleware');
const upload = require('../config/multer'); 


// Public — redirect to dashboard if already logged in
router.get('/signup',           redirectIfTutor, tutorController.getSignup);
router.post('/signup', upload.single('certificateFile'), tutorController.postSignup);
router.get('/login',            redirectIfTutor, tutorController.getLogin);
router.post('/login',           tutorController.postLogin);     
router.get('/logout',           tutorController.logout);

router.get('/verify-otp',       tutorController.getOtp);
router.post('/verify-otp',      tutorController.postOtp);
router.post('/resend-otp',      tutorController.resendOtp);

router.get('/forgot-password',  tutorController.getForgotPassword);
router.post('/forgot-password', tutorController.postForgotPassword);
router.get('/reset-password',   tutorController.getResetPassword);
router.post('/reset-password',  tutorController.postResetPassword);

// Protected — must be logged in
router.get('/dashboard', isTutor, tutorController.getDashboard);
router.get('/profile',   isTutor, tutorController.getProfile);
module.exports = router;

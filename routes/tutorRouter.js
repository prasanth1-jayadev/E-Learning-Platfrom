const express = require('express');
const router  = express.Router();
const tutorController = require('../controllers/tutorController');
const { isTutor, isTutorApproved, redirectIfTutor } = require('../middleware/authMiddleware');
const upload = require('../config/multer'); 
const passport = require('../config/passport');


router.get('/auth/google', passport.authenticate('google-tutor'));

router.get('/auth/google/callback', 
    (req, res, next) => {
        passport.authenticate('google-tutor', (err, user, info) => {
            if (err) {
                console.error('Google OAuth Error:', err);
                return res.redirect('/tutor/login?error=google_auth_failed');
            }
            if (!user) {
                return res.redirect('/tutor/login?error=google_auth_failed');
            }
            
            req.logIn(user, (err) => {
                if (err) {
                    console.error('Login Error:', err);
                    return res.redirect('/tutor/login?error=google_auth_failed');
                }
                
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error('Session save error:', saveErr);
                        return res.redirect('/tutor/login?error=session_error');
                    }
                    return res.redirect('/tutor/dashboard');
                });
            });
        })(req, res, next);
    }
);

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

// Protected 
router.get('/dashboard', isTutor, tutorController.getDashboard);
router.get('/profile',   isTutor, tutorController.getProfile);

router.get('/courses',   isTutorApproved, tutorController.getCourses);
router.get('/students',  isTutorApproved, tutorController.getStudents);
router.get('/earnings',  isTutorApproved, tutorController.getEarnings);

module.exports = router;

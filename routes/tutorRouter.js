import express from 'express';
import * as tutorController from '../controllers/tutor/tutorController.js';
import * as courseController from '../controllers/tutor/courseController.js';
import { isTutor, isTutorApproved, redirectIfTutor } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';
import passport from '../config/passport.js';

const router = express.Router();

router.get('/signup', redirectIfTutor, tutorController.getSignup);
router.post('/signup', upload.single('certificateFile'), tutorController.postSignup);
router.get('/login', redirectIfTutor, tutorController.getLogin);
router.post('/login', tutorController.postLogin);
router.get('/logout', tutorController.logout);

router.get('/verify-otp', tutorController.getOtp);
router.post('/verify-otp', tutorController.postOtp);
router.post('/resend-otp', tutorController.resendOtp);

router.get('/forgot-password', tutorController.getForgotPassword);
router.post('/forgot-password', tutorController.postForgotPassword);
router.get('/reset-password', tutorController.getResetPassword);
router.post('/reset-password', tutorController.postResetPassword);

// Dashboard and profile
router.get('/dashboard', isTutor, tutorController.getDashboard);
router.get('/profile', isTutor, tutorController.getProfile);
router.post('/update-profile', isTutor, tutorController.postUpdateProfile);
router.post('/send-email-change-otp', isTutor, tutorController.postSendEmailChangeOTP);
router.post('/verify-email-change', isTutor, tutorController.postVerifyEmailChange);
router.post('/resend-email-otp', isTutor, tutorController.postResendEmailOTP);
router.post('/change-password', isTutor, tutorController.postChangePassword);

// Course routes
router.get('/courses', isTutor, courseController.getCourses);
router.get('/courses/create', isTutor, isTutorApproved, courseController.getCreateCourse);
router.get('/course/:id/add-lesson', isTutor, isTutorApproved, tutorController.getAddLessonPage);
router.post('/course/:id/add-lesson', isTutor, isTutorApproved, upload.single('video'), tutorController.addLesson);
router.get('/course/:id/lesson/:lessonId/edit', isTutor, isTutorApproved, tutorController.getEditLessonPage);
router.post('/course/:id/lesson/:lessonId/edit', isTutor, isTutorApproved, upload.single('video'), tutorController.updateLesson);
router.delete('/course/:id/lesson/:lessonId', isTutor, isTutorApproved, tutorController.deleteLesson);
router.post('/courses/create', isTutor, isTutorApproved, (req, res, next) => {
    upload.single('thumbnail')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ 
                success: false,
                message: err.message || 'File upload failed' 
            });
        }
        next();
    });
}, courseController.postCreateCourse);
router.get('/courses/:id/edit', isTutor, courseController.getEditCourse);
router.post('/courses/:id/edit', isTutor, (req, res, next) => {
    upload.single('thumbnail')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ 
                success: false,
                message: err.message || 'File upload failed' 
            });
        }
        next();
    });
}, courseController.postUpdateCourse);
router.delete('/courses/:id', isTutor, courseController.deleteCourse);
router.post('/courses/:id/toggle-publish', isTutor, courseController.togglePublish);
router.get('/courses/:id/details', isTutor, courseController.getCourseDetails);

// Google OAuth
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

export default router;

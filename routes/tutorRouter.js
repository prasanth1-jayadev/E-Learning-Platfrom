import express from 'express';
import * as tutorController   from '../controllers/tutor/tutorController.js';
import * as profileController from '../controllers/tutor/profileController.js';
import * as lessonController  from '../controllers/tutor/lessonController.js';
import * as courseController  from '../controllers/tutor/courseController.js';
import * as walletController  from '../controllers/tutor/walletController.js';
import { isTutor, isTutorApproved, redirectIfTutor } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';
import passport from '../config/passport.js';
import { uploadCertificate, uploadVideo } from '../config/multer.js';

const router = express.Router();


// Auth

router.get('/signup',  redirectIfTutor, tutorController.getSignup);
router.post('/signup', uploadCertificate.single('certificateFile'), tutorController.postSignup);
router.get('/login',   redirectIfTutor, tutorController.getLogin);
router.post('/login',  tutorController.postLogin);
router.get('/logout',  tutorController.logout);

router.get('/verify-otp',  tutorController.getOtp);
router.post('/verify-otp', tutorController.postOtp);
router.post('/resend-otp', tutorController.resendOtp);

router.get('/forgot-password',  tutorController.getForgotPassword);
router.post('/forgot-password', tutorController.postForgotPassword);
router.get('/reset-password',   tutorController.getResetPassword);
router.post('/reset-password',  tutorController.postResetPassword);

// Dashboard
router.get('/dashboard', isTutor, tutorController.getDashboard);

router.get('/profile',  isTutor, profileController.getProfile);
router.post('/update-profile', isTutor, profileController.postUpdateProfile);
router.post('/resubmit-application', isTutor, uploadCertificate.single('certificateFile'), profileController.resubmitApplication);

router.post('/upload-avatar',  isTutor, (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
        }
        next();
    });
}, profileController.postUploadAvatar);
router.post('/send-email-change-otp', isTutor, profileController.postSendEmailChangeOTP);
router.post('/verify-email-change',   isTutor, profileController.postVerifyEmailChange);
router.post('/resend-email-otp',      isTutor, profileController.postResendEmailOTP);
router.post('/change-password',       isTutor, profileController.postChangePassword);

// Orders
router.get('/orders', isTutor, isTutorApproved, lessonController.getOrders);


// Lessons

router.get('/course/:id/add-lesson',  isTutor, isTutorApproved, lessonController.getAddLessonPage);
router.post('/course/:id/add-lesson', isTutor, isTutorApproved, (req, res, next) => {
    uploadVideo.single('video')(req, res, (err) => {
        if (err) {
            console.error('Multer video upload error:', err);
            return res.status(400).json({ success: false, message: err.message || 'Video upload failed' });
        }
        next();
    });
}, lessonController.addLesson);

router.get('/course/:id/lesson/:lessonId/edit',  isTutor, isTutorApproved, lessonController.getEditLessonPage);
router.post('/course/:id/lesson/:lessonId/edit', isTutor, isTutorApproved, (req, res, next) => {
    uploadVideo.single('video')(req, res, (err) => {
        if (err) {
            console.error('Multer video upload error:', err);
            return res.status(400).json({ success: false, message: err.message || 'Video upload failed' });
        }
        next();
    });
}, lessonController.updateLesson);

router.delete('/course/:id/lesson/:lessonId', isTutor, isTutorApproved, lessonController.deleteLesson);


// Courses

router.get('/courses',         isTutor, courseController.getCourses);
router.get('/courses/create',  isTutor, isTutorApproved, courseController.getCreateCourse);
router.post('/courses/create', isTutor, isTutorApproved, (req, res, next) => {
    upload.single('thumbnail')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
        }
        next();
    });
}, courseController.postCreateCourse);
router.get('/courses/:id/edit',  isTutor, courseController.getEditCourse);
router.post('/courses/:id/edit', isTutor, (req, res, next) => {
    upload.single('thumbnail')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
        }
        next();
    });
}, courseController.postUpdateCourse);
router.delete('/courses/:id',                   isTutor, courseController.deleteCourse);
router.post('/courses/:id/toggle-publish',      isTutor, courseController.togglePublish);
router.get('/courses/:id/details',              isTutor, courseController.getCourseDetails);


// Wallet

router.get('/wallet',          isTutor, walletController.getWallet);
router.post('/wallet/withdraw', isTutor, walletController.requestWithdrawal);
router.get('/chat', isTutor, (req, res) => res.redirect('/chat/tutor'));


// Google OAuth

router.get('/auth/google', passport.authenticate('google-tutor'));

router.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google-tutor', (err, user, info) => {
            if (err) {
                console.error('Google OAuth Error:', err);
                return res.redirect('/tutor/login?error=google_auth_failed');
            }
            if (!user) return res.redirect('/tutor/login?error=google_auth_failed');

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

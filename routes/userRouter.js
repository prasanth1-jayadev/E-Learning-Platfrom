import express from 'express';
import * as userController from '../controllers/user/userController.js';
import { isUser, redirectIfUser } from '../middleware/authMiddleware.js';
import passport from '../config/passport.js';

const router = express.Router();

router.get('/', userController.getLanding);
router.get('/landing', userController.getLanding);
router.get('/signup', redirectIfUser, userController.getSignup);
router.post('/signup', userController.postSignup);
router.get('/login', redirectIfUser, userController.getLogin);
router.post('/login', userController.postLogin);
router.get('/logout', userController.logout);

router.get('/verify-otp', userController.getOtp);
router.post('/verify-otp', userController.postOtp);
router.post('/resend-otp', userController.resendOtp);

router.get('/forgot-password', userController.getForgotPassword);
router.post('/forgot-password', userController.postForgotPassword);
router.get('/reset-password', userController.getResetPassword);
router.post('/reset-password', userController.postResetPassword);

router.get('/auth/google', passport.authenticate('google-user'));

router.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google-user', (err, user, info) => {
            if (err) {
                console.error('Google OAuth Error:', err);
                return res.redirect('/user/login?error=google_auth_failed');
            }
            if (!user) {
                return res.redirect('/user/login?error=google_auth_failed');
            }

            req.logIn(user, (err) => {
                if (err) {
                    console.error('Login Error:', err);
                    return res.redirect('/user/login?error=google_auth_failed');
                }

                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error('Session save error:', saveErr);
                        return res.redirect('/user/login?error=session_error');
                    }
                    return res.redirect('/user/home');
                });
            });
        })(req, res, next);
    }
);

router.get('/home', isUser, userController.getHome);
router.get('/courses', userController.getCourses);
router.get('/course/:id', userController.getCourseDetail);
router.get('/profile', isUser, userController.getProfile);
router.get('/edit-profile', isUser, userController.getEditProfile);
router.post('/update-profile', isUser, userController.postUpdateProfile);
router.post('/send-email-change-otp', isUser, userController.postSendEmailChangeOTP);
router.post('/verify-email-change', isUser, userController.postVerifyEmailChange);
router.post('/resend-email-otp', isUser, userController.postResendEmailOTP);
router.post('/change-password', isUser, userController.postChangePassword);

export default router;

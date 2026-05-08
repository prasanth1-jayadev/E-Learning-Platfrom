import express from 'express';
import * as authController from '../controllers/user/authController.js';
import * as profileController from '../controllers/user/profileController.js';
import * as pageController from '../controllers/user/pageController.js';
import * as courseController from '../controllers/user/userCourseController.js';
import * as tutorController from '../controllers/user/userTutorController.js';
import * as cartController from '../controllers/user/cartController.js';
import { isUser, redirectIfUser } from '../middleware/authMiddleware.js';
import passport from '../config/passport.js';
import { upload } from '../config/cloudinary.js';
import * as paymentController from '../controllers/user/paymentController.js';



const router = express.Router();

// Landing & Home Pages
router.get('/', pageController.getLanding);
router.get('/landing', pageController.getLanding);
router.get('/home', isUser, pageController.getHome);

// Authentication Routes
router.get('/signup', redirectIfUser, authController.getSignup);
router.post('/signup', authController.postSignup);
router.get('/login', redirectIfUser, authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

router.get('/verify-otp', authController.getOtp);
router.post('/verify-otp', authController.postOtp);
router.post('/resend-otp', authController.resendOtp);

router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password', authController.getResetPassword);
router.post('/reset-password', authController.postResetPassword);

// Google OAuth
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

//payment Routes 
router.post('/payment/create-order', isUser, paymentController.createOrder);
router.post('/payment/verify', isUser, paymentController.verifyPayment);
router.post('/enroll-free', isUser, paymentController.enrollFree);
router.get('/payment/success', isUser, paymentController.getPaymentSuccess);
router.get('/payment/failure', isUser, paymentController.getPaymentFailure);



// Cart Routes
router.get('/cart', isUser, cartController.getCart);
router.post('/cart/add', isUser, cartController.addToCart);
router.post('/cart/remove/:courseId', isUser, cartController.removeFromCart);
router.get('/cart/count', isUser, cartController.getCartCount);

// Course Routes
router.get('/courses', courseController.getCourses);
router.get('/course/:id', courseController.getCourseDetail);



// Tutor Routes
router.get('/tutors', tutorController.getTutors);
router.get('/tutor/:id', tutorController.getTutorDetail);

// Profile Routes
router.get('/profile', isUser, profileController.getProfile);
router.get('/edit-profile', isUser, profileController.getEditProfile);
router.post('/update-profile', isUser, profileController.postUpdateProfile);
router.post('/upload-avatar', isUser, upload.single('avatar'), profileController.postUploadAvatar);
router.post('/send-email-change-otp', isUser, profileController.postSendEmailChangeOTP);
router.post('/verify-email-change', isUser, profileController.postVerifyEmailChange);
router.post('/resend-email-otp', isUser, profileController.postResendEmailOTP);
router.get('/my-courses', isUser, profileController.getMyCourses);
router.post('/change-password', isUser, profileController.postChangePassword);


export default router;

const express = require('express');
const router  = express.Router();
const userController = require('../controllers/userController');
const { isUser, redirectIfUser } = require('../middleware/authMiddleware');

// Public — redirect to home if already logged in
router.get('/landing',          userController.getLanding);
router.get('/signup',           redirectIfUser, userController.getSignup);
router.post('/signup',          userController.postSignup);
router.get('/login',            redirectIfUser, userController.getLogin);
router.post('/login',           userController.postLogin);
router.get('/logout',           userController.logout);

router.get('/verify-otp',       userController.getOtp);
router.post('/verify-otp',      userController.postOtp);
router.post('/resend-otp',      userController.resendOtp);

router.get('/forgot-password',  userController.getForgotPassword);
router.post('/forgot-password', userController.postForgotPassword);
router.get('/reset-password',   userController.getResetPassword);
router.post('/reset-password',  userController.postResetPassword);

// Protected — must be logged in
router.get('/home',    isUser, userController.getHome);
router.get('/profile', isUser, userController.getProfile);

module.exports = router;

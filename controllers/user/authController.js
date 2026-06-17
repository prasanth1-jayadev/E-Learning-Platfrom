import * as userService from '../../service/userService.js';
import {
    validateEmail,
    validatePassword,
    validateFullName,
} from '../../helpers/validationHelper.js';

// Render pages
const getSignup        = (req, res) => res.render('user/signup');
const getLogin         = (req, res) => res.render('user/login');
const getOtp           = (req, res) => res.render('user/otp');
const getForgotPassword = (req, res) => res.render('user/forgot-password');
const getResetPassword  = (req, res) => res.render('user/reset-password');

// Signup
const postSignup = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const nameCheck = validateFullName(fullName);
        if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message });

        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        await userService.registerUser({ fullName: fullName.trim(), email: email.trim(), password });

        req.session.otpEmail   = email.trim();
        req.session.otpPurpose = 'signup';

        res.json({ redirect: '/user/verify-otp' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

// Login
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userService.loginUser(email, password);

        if (!user.isVerified) {
            req.session.otpEmail   = email;
            req.session.otpPurpose = 'signup';
            return res.json({ redirect: '/user/verify-otp' });
        }

        req.session.userId = user._id;
        res.json({ redirect: '/user/home' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

// Logout
const logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/user/login');
    });
};

// OTP Verification
const postOtp = async (req, res) => {
    try {
        const { otp }   = req.body;
        const email     = req.session.otpEmail;
        const purpose   = req.session.otpPurpose || 'signup';

        if (!email) {
            return res.status(400).json({ message: 'Session expired. Please try again.' });
        }

        await userService.verifyOtp(email, otp, purpose);

        if (purpose === 'reset') {
            req.session.resetEmail = email;
            req.session.allowReset = true;
            req.session.otpEmail   = null;
            return res.json({ redirect: '/user/reset-password' });
        }

        const user = await userService.getUserByEmail(email);
        req.session.userId   = user._id;
        req.session.otpEmail = null;
        res.json({ redirect: '/user/home' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

// Resend OTP
const resendOtp = async (req, res) => {
    try {
        const email   = req.session.otpEmail;
        const purpose = req.session.otpPurpose || 'signup';

        if (!email) {
            return res.status(400).json({ message: 'Session expired.' });
        }

        await userService.resendOtp(email, purpose);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

// Forgot Password
const postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await userService.forgotPassword(email);

        req.session.otpEmail   = email;
        req.session.otpPurpose = 'reset';

        res.json({ redirect: '/user/verify-otp' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

// Reset Password
const postResetPassword = async (req, res) => {
    try {
        if (!req.session.allowReset) {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        const { password } = req.body;

        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        await userService.resetPassword(req.session.resetEmail, password);

        req.session.allowReset = null;
        req.session.resetEmail = null;

        res.json({ redirect: '/user/login' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

export {
    getSignup,
    postSignup,
    getLogin,
    postLogin,
    logout,
    getOtp,
    postOtp,
    resendOtp,
    getForgotPassword,
    postForgotPassword,
    getResetPassword,
    postResetPassword,
};

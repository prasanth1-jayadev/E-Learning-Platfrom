
import * as tutorService  from '../../service/tutorService.js';
import * as courseService from '../../service/courseService.js';
import {
    validateEmail,
    validatePassword,
    validateFullName,
} from '../../helpers/validationHelper.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';



const getSignup         = (req, res) => res.render('tutor/signup');
const getLogin          = (req, res) => res.render('tutor/login');
const getOtp            = (req, res) => res.render('tutor/otp');
const getForgotPassword = (req, res) => res.render('tutor/forgot-password');
const getResetPassword  = (req, res) => res.render('tutor/reset-password');



const getDashboard = async (req, res) => {
    try {
        const tutor = await tutorService.getTutorById(req.session.tutorId);
        if (!tutor) return res.redirect('/tutor/login');

        let stats = {
            totalCourses: 0, publishedCourses: 0,
            draftCourses: 0, totalStudents:    0, totalRevenue: 0
        };
        let recentCourses = [];
        let analytics = {
            revenueData: {
                labels:  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                revenue: [0,0,0,0,0,0,0,0,0,0,0,0],
                profit:  [0,0,0,0,0,0,0,0,0,0,0,0]
            },
            coursePerformance: { excellent: 0, good: 0, average: 0 },
            keyMetrics:        { totalViews: 0, totalEnrollments: 0, totalCompletions: 0 }
        };

        if (tutor.approvalStatus === 'approved') {
            stats         = await courseService.getDashboardStats(req.session.tutorId);
            recentCourses = (await courseService.getTutorCourses(req.session.tutorId, {})).slice(0, 5);
            analytics     = await courseService.getTutorAnalytics(req.session.tutorId);
        }

        res.render('tutor/dashboard', {
            tutor,
            approvalStatus: tutor.approvalStatus,
            isApproved:     tutor.approvalStatus === 'approved',
            currentPage:    'dashboard',
            stats,
            recentCourses,
            analytics
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/tutor/login');
    }
};



const postSignup = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const certificateFile               = req.file;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const nameCheck = validateFullName(fullName);
        if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message });

        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        if (!certificateFile) {
            return res.status(400).json({ message: 'Please upload your certificate' });
        }

        const allowedTypes = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(certificateFile.mimetype)) {
            return res.status(400).json({ message: 'Only PDF, PNG, JPG files are allowed' });
        }

        if (certificateFile.size > 5 * 1024 * 1024) {
            return res.status(400).json({ message: 'File size must be less than 5MB' });
        }

        const formattedPath = certificateFile.path ? '/' + certificateFile.path.replace(/\\/g, '/') : null;

        await tutorService.registerTutor({
            fullName:            fullName.trim(),
            email:               email.trim(),
            password,
            certificatePath:     formattedPath,
            certificatePublicId: certificateFile.filename
        });

        req.session.otpEmail   = email.trim();
        req.session.otpPurpose = 'signup';

        res.json({ redirect: '/tutor/verify-otp' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};



const postOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const email   = req.session.otpEmail;
        const purpose = req.session.otpPurpose || 'signup';

        if (!email) return res.status(400).json({ message: 'Session expired' });

        await tutorService.verifyOtp(email, otp, purpose);

        if (purpose === 'reset') {
            req.session.resetEmail = email;
            req.session.allowReset = true;
            req.session.otpEmail   = null;
            return res.json({ redirect: '/tutor/reset-password' });
        }

        req.session.otpEmail = null;
        res.json({ redirect: '/tutor/dashboard' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

const resendOtp = async (req, res) => {
    try {
        const email   = req.session.otpEmail;
        const purpose = req.session.otpPurpose || 'signup';

        if (!email) return res.status(400).json({ message: 'Session expired' });

        await tutorService.resendOtp(email, purpose);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};


const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const tutor = await tutorService.loginTutor(email, password);
        req.session.tutorId = tutor._id;
        res.json({ redirect: '/tutor/dashboard' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

const logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/tutor/login');
    });
};


const postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await tutorService.forgotPassword(email);

        req.session.otpEmail   = email;
        req.session.otpPurpose = 'reset';

        res.json({ redirect: '/tutor/verify-otp' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
};

const postResetPassword = async (req, res) => {
    try {
        if (!req.session.allowReset) {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        const { password } = req.body;

        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        await tutorService.resetPassword(req.session.resetEmail, password);

        req.session.allowReset = null;
        req.session.resetEmail = null;

        res.json({ redirect: '/tutor/login' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export {
    
    getSignup, getLogin, getOtp, getForgotPassword, getResetPassword,
    postSignup, postLogin, logout,
    postOtp, resendOtp,
    postForgotPassword, postResetPassword,
    getDashboard,
};

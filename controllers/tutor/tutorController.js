import * as tutorService from '../../service/tutorService.js';
import * as courseService from '../../service/courseService.js';
import Tutor from '../../models/Tutor.js';
import Course from '../../models/Course.js';

const getSignup = (req, res) => res.render('tutor/signup');
const getLogin = (req, res) => res.render('tutor/login');
const getOtp = (req, res) => res.render('tutor/otp');
const getForgotPassword = (req, res) => res.render('tutor/forgot-password');
const getResetPassword = (req, res) => res.render('tutor/reset-password');

const getDashboard = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.session.tutorId);

        if (!tutor) {
            return res.redirect('/tutor/login');
        }

       
        let stats = {
            totalCourses: 0,
            publishedCourses: 0,
            draftCourses: 0,
            totalStudents: 0,
            totalRevenue: 0
        };

        let recentCourses = [];

        if (tutor.approvalStatus === 'approved') {
            stats = await courseService.getDashboardStats(req.session.tutorId);
            recentCourses = await courseService.getTutorCourses(req.session.tutorId, {});
            recentCourses = recentCourses.slice(0, 5); // get recent 5 courses
        }

        res.render('tutor/dashboard', {
            tutor,
            approvalStatus: tutor.approvalStatus,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'dashboard',
            stats,
            recentCourses
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/tutor/login');
    }
};

const getProfile = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.session.tutorId);

        if (!tutor) {
            return res.redirect('/tutor/login');
        }

        res.render('tutor/profile', {
            tutor,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'profile'
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.redirect('/tutor/login');
    }
};




const postUpdateProfile = async (req, res) => {
    try {
        const { fullName, phone, subjects, bio } = req.body;

       
        if (!fullName || fullName.trim().length === 0) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
            return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
        }

        if (bio && bio.trim().length > 500) {
            return res.status(400).json({ message: 'Bio must be 500 characters or less' });
        }

        if (phone && phone.trim().length > 0) {
            const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
            if (!phoneRegex.test(phone.trim())) {
                return res.status(400).json({ message: 'Please enter a valid phone number' });
            }
        }

        const tutor = await Tutor.findById(req.session.tutorId);
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

      
        tutor.fullName = fullName.trim();
        tutor.phone = phone ? phone.trim() : null;
        tutor.subjects = subjects ? subjects.trim() : null;
        tutor.bio = bio ? bio.trim() : null;
        await tutor.save();

        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ message: error.message });
    }
};




const postSendEmailChangeOTP = async (req, res) => {
    try {
        const { newEmail } = req.body;

        
        if (!newEmail || newEmail.trim().length === 0) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        const newEmailTrimmed = newEmail.trim().toLowerCase();

        // Check if new email already exists
        const existingTutor = await Tutor.findOne({ email: newEmailTrimmed });
        if (existingTutor) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Send OTP to new email
        await tutorService.sendEmailChangeOTP(newEmailTrimmed);

        res.json({ success: true, message: 'OTP sent to new email' });

    } catch (error) {
        console.error('Send email OTP error:', error);
        res.status(400).json({ message: error.message });
    }
};






const postVerifyEmailChange = async (req, res) => {
    try {
        const { otp, newEmail } = req.body;

     
        if (!otp || otp.trim().length === 0) {
            return res.status(400).json({ message: 'OTP is required' });
        }

        if (otp.trim().length !== 4) {
            return res.status(400).json({ message: 'OTP must be 4 digits' });
        }

        if (!/^\d{4}$/.test(otp.trim())) {
            return res.status(400).json({ message: 'OTP must contain only numbers' });
        }

        if (!newEmail || newEmail.trim().length === 0) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            return res.status(400).json({ message: 'Invalid email address' });
        }


        await tutorService.verifyEmailChangeOTP(newEmail, otp);

        // Update tutor with new email
        const tutor = await Tutor.findById(req.session.tutorId);
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        tutor.email = newEmail.trim().toLowerCase();
        await tutor.save();

        res.json({ success: true, message: 'Email updated successfully' });

    } catch (error) {
        console.error('Verify email change error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postResendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || email.trim().length === 0) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ message: 'Invalid email address' });
        }

        await tutorService.sendEmailChangeOTP(email);
        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({ message: 'Password must contain uppercase, lowercase, and number' });
        }

        const tutor = await Tutor.findById(req.session.tutorId);
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const isMatch = await tutorService.comparePassword(currentPassword, tutor.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await tutorService.hashPassword(newPassword);
        tutor.password = hashedPassword;
        await tutor.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(400).json({ message: error.message });
    }
};



const postSignup = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const certificateFile = req.file;

     
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const nameRegex = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
        if (!nameRegex.test(fullName.trim())) {
            return res.status(400).json({ message: 'Full name can only contain letters and single spaces between words' });
        }

        if (fullName.trim().length < 2 || fullName.trim().length > 50) {
            return res.status(400).json({ message: 'Full name must be between 2 and 50 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
        }

        if (!certificateFile) {
            return res.status(400).json({ message: 'Please upload your certificate' });
        }

        const allowedTypes = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(certificateFile.mimetype)) {
            return res.status(400).json({ message: 'Only PDF, PNG, JPG files are allowed' });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (certificateFile.size > maxSize) {
            return res.status(400).json({ message: 'File size must be less than 5MB' });
        }

        // Cloudinary returns: path (URL) and filename (public_id)
        await tutorService.registerTutor({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            certificatePath: certificateFile.path,        // Cloudinary URL
            certificatePublicId: certificateFile.filename  // Cloudinary public_id
        });

        req.session.otpEmail = email.trim();
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
        const email = req.session.otpEmail;
        const purpose = req.session.otpPurpose || 'signup';

        console.log('📥 OTP SUBMISSION');
        console.log('========================================');
        console.log('OTP from form:', otp);
        console.log('Email from session:', email);
        console.log('Purpose:', purpose);
      

        if (!email) {
            return res.status(400).json({ message: "session - expired" })
        }
        await tutorService.verifyOtp(email, otp, purpose);

        if (purpose === 'reset') {
            req.session.resetEmail = email;
            req.session.allowReset = true;
            req.session.otpEmail = null;

            return res.json({ redirect: '/tutor/reset-password' })
        }
        req.session.otpEmail = null;
        res.json({ redirect: '/tutor/dashboard' })
    } catch (err) {
        console.error(err)
        res.status(400).json({ message: err.message });
    }
}

const resendOtp = async (req, res) => {
    try {
        const email = req.session.otpEmail;
        const purpose = req.session.otpPurpose || 'signup'

        if (!email) {
            return res.status(400).json({ message: 'session expired' })
        }
        await tutorService.resendOtp(email, purpose);
        res.json({ success: true })
    } catch (err) {
        console.error(err)
        res.status(400).json({ message: err.message });
    }
}



const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const tutor = await tutorService.loginTutor(email, password);

        req.session.tutorId = tutor._id

        res.json({ redirect: '/tutor/dashboard' });

    } catch (err) {
        console.error(err)
        res.status(400).json({ message: err.message })
    }
}



const logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/tutor/login');
    });
};



const postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        await tutorService.forgotPassword(email);

        req.session.otpEmail = email;
        req.session.otpPurpose = 'reset'

        res.json({ redirect: '/tutor/verify-otp' });

    } catch (err) {
        console.error(err)
        res.status(400).json({ message: err.message });

    }
}

const postResetPassword = async (req, res) => {
    try {
        if (!req.session.allowReset) {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        const { password } = req.body;
        await tutorService.resetPassword(req.session.resetEmail, password);

        req.session.allowReset = null;
        req.session.resetEmail = null;

        res.json({ redirect: '/tutor/login' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const getCourses = async (req, res) => {
    try {
        const tutorId = req.session.tutorId;
        const tutor = await Tutor.findById(tutorId);
        
        if (!tutor) {
            return res.redirect('/tutor/login');
        }

        const filters = {
            status: req.query.status,
            category: req.query.category
        };

        const courses = await courseService.getTutorCourses(tutorId, filters);
        
        res.render('tutor/courses', { 
            tutor, 
            courses,
            currentPage: 'courses' 
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        res.render('tutor/courses', { 
            tutor: { fullName: 'Tutor' }, 
            courses: [],
            currentPage: 'courses' 
        });
    }
};

const getAddLessonPage = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.session.tutorId);
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.redirect('/tutor/courses');
        }

        res.render('tutor/add-lesson', { tutor, course });
    } catch (error) {
        console.error('Error loading add lesson page:', error);
        res.redirect('/tutor/courses');
    }
};

const addLesson = async (req, res) => {
    try {
        const { title, description, duration } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const newLesson = {
            title,
            description,
            duration,
            videoUrl: req.file ? req.file.path : '',
            order: course.lessons.length + 1
        };

        course.lessons.push(newLesson);
        await course.save();

        res.json({ success: true, message: 'Lesson added successfully' });
    } catch (error) {
        console.error('Error adding lesson:', error);
        res.status(500).json({ message: 'Failed to add lesson' });
    }
};




const getEditLessonPage = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.session.tutorId);
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.redirect('/tutor/courses');
        }

        const lesson = course.lessons.id(req.params.lessonId);
        if (!lesson) {
            return res.redirect('/tutor/course/' + req.params.id + '/add-lesson');
        }

        res.render('tutor/edit-lesson', { tutor, course, lesson });
    } catch (error) {
        console.error('Error loading edit lesson page:', error);
        res.redirect('/tutor/courses');
    }
};




const updateLesson = async (req, res) => {
    try {
        const { title, description, duration } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const lesson = course.lessons.id(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        lesson.title = title;
        lesson.description = description;
        lesson.duration = duration;
        
        if (req.file) {
            lesson.videoUrl = req.file.path;
        }

        await course.save();

        res.json({ success: true, message: 'Lesson updated successfully' });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ message: 'Failed to update lesson' });
    }
};




const deleteLesson = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        course.lessons.pull(req.params.lessonId);
        await course.save();

        res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ message: 'Failed to delete lesson' });
    }
};

export {
    getSignup, postSignup,
    getLogin, postLogin, logout,
    getOtp, postOtp, resendOtp,
    getForgotPassword, postForgotPassword,
    getResetPassword, postResetPassword,
    getDashboard, getCourses, getProfile,
    postUpdateProfile, postSendEmailChangeOTP, postVerifyEmailChange, postResendEmailOTP,
    postChangePassword,
    getAddLessonPage, addLesson, getEditLessonPage, updateLesson, deleteLesson
};

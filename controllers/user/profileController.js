import * as userService from '../../service/userService.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import {
    validateEmail,
    validatePassword,
    validateFullName,
    validatePhone,
    validateOTP,
} from '../../helpers/validationHelper.js';

const getProfile = async (req, res) => {
    try {
        const user = await userService.getUserById(req.session.userId);
        if (!user) return res.redirect('/user/login');

        res.render('user/profile', { user, currentPage: 'profile' });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.redirect('/user/home');
    }
};

const postUpdateProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body;

        const nameCheck = validateFullName(fullName);
        if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message });

        const phoneCheck = validatePhone(phone);
        if (!phoneCheck.valid) return res.status(400).json({ message: phoneCheck.message });

        await userService.updateUserProfile(req.session.userId, {
            fullName: fullName.trim(),
            phone:    phone ? phone.trim() : null
        });

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postUploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');
        await userService.updateUserAvatar(req.session.userId, result.secure_url);

        res.json({ success: true, message: 'Profile photo updated successfully', avatar: result.secure_url });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postSendEmailChangeOTP = async (req, res) => {
    try {
        const { newEmail } = req.body;

        const emailCheck = validateEmail(newEmail);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        const newEmailTrimmed = newEmail.trim().toLowerCase();
        await userService.sendEmailChangeOTP(newEmailTrimmed);

        res.json({ success: true, message: 'OTP sent to new email' });
    } catch (error) {
        console.error('Send email OTP error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postVerifyEmailChange = async (req, res) => {
    try {
        const { otp, newEmail } = req.body;

        const otpCheck = validateOTP(otp);
        if (!otpCheck.valid) return res.status(400).json({ message: otpCheck.message });

        const emailCheck = validateEmail(newEmail);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        await userService.verifyEmailChangeOTP(newEmail, otp);
        await userService.updateUserEmail(req.session.userId, newEmail);

        res.json({ success: true, message: 'Email updated successfully' });
    } catch (error) {
        console.error('Verify email change error:', error);
        res.status(400).json({ message: error.message });
    }
};

const postResendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        await userService.sendEmailChangeOTP(email);
        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(400).json({ message: error.message });
    }
};

const getMyCourses = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.redirect('/user/login');

        const { user, courses } = await userService.getEnrolledCourses(userId);

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const totalCourses = courses.length;
        const paginatedCourses = courses.slice(skip, skip + limit);
        const totalPages = Math.ceil(totalCourses / limit) || 1;

        res.render('user/my-courses', {
            user,
            courses: paginatedCourses,
            currentPage: 'my-courses',
            page,
            totalPages,
            totalCourses
        });
    } catch (error) {
        console.error('Error fetching my courses:', error);
        res.redirect('/user/profile');
    }
};

const postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        const user = await userService.getUserById(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await userService.comparePassword(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        const hashedPassword = await userService.hashPassword(newPassword);
        await userService.updateUserPassword(req.session.userId, hashedPassword);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(400).json({ message: error.message });
    }
};

export {
    getProfile,
    postUpdateProfile,
    postUploadAvatar,
    postSendEmailChangeOTP,
    postVerifyEmailChange,
    postResendEmailOTP,
    postChangePassword,
    getMyCourses,
};

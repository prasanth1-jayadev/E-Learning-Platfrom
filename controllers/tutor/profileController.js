
import * as tutorService from '../../service/tutorService.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import {
    validateEmail,
    validatePassword,
    validateFullName,
    validateIntlPhone,
    validateOTP,
    validateBio,
} from '../../helpers/validationHelper.js';

const getProfile = async (req, res) => {
    try {
        const tutor = await tutorService.getTutorById(req.session.tutorId);
        if (!tutor) return res.redirect('/tutor/login');

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

        const nameCheck = validateFullName(fullName, { min: 2, max: 100 });
        if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message });

        const bioCheck = validateBio(bio);
        if (!bioCheck.valid) return res.status(400).json({ message: bioCheck.message });

        const phoneCheck = validateIntlPhone(phone);
        if (!phoneCheck.valid) return res.status(400).json({ message: phoneCheck.message });

        await tutorService.updateTutorProfile(req.session.tutorId, {
            fullName: fullName.trim(),
            phone:    phone    ? phone.trim()    : null,
            subjects: subjects ? subjects.trim() : null,
            bio:      bio      ? bio.trim()      : null,
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
        await tutorService.updateTutorAvatar(req.session.tutorId, result.secure_url);

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

        const otpCheck = validateOTP(otp);
        if (!otpCheck.valid) return res.status(400).json({ message: otpCheck.message });

        const emailCheck = validateEmail(newEmail);
        if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message });

        await tutorService.verifyEmailChangeOTP(newEmail, otp);
        await tutorService.updateTutorEmail(req.session.tutorId, newEmail);

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

        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) return res.status(400).json({ message: pwCheck.message });

        const tutor = await tutorService.getTutorById(req.session.tutorId);
        if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

        const isMatch = await tutorService.comparePassword(currentPassword, tutor.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        const hashedPassword = await tutorService.hashPassword(newPassword);
        await tutorService.updateTutorPassword(req.session.tutorId, hashedPassword);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(400).json({ message: error.message });
    }
};

  export const resubmitApplication = async(req,res)=>{
    try{
        const tutorId = req.session.tutorId;
        const certificateFile =req.file;


        if(!certificateFile){
            return res.status(400).json({success:false, message:'please Upload a certificate File'});
        }
        const formattedPath = '/' + certificateFile.path.replace(/\\/g, '/');
        const tutorModel = (await import('../../models/Tutor.js')).default;


        await tutorModel.findByIdAndUpdate(tutorId, {
            certificatePath: formattedPath,
            certificatePublicId: certificateFile.filename,
            approvalStatus: 'pending',
            isApproved: false
        });
        res.json({ success: true, message: 'Application Resubmitted successfully' });
    } catch (error) {
        console.error('Resubmit application error:', error);
        res.status(500).json({ success: false, message: 'Failed to resubmit application' });
    }
  }


export {
    getProfile,
    postUpdateProfile,
    postUploadAvatar,
    postSendEmailChangeOTP,
    postVerifyEmailChange,
    postResendEmailOTP,
    postChangePassword,
};

import Tutor from '../models/Tutor.js';
import OTP from '../models/OTP.js';
import { hashPassword, comparePassword } from '../helpers/passwordHelper.js';
import { generateOTP, otpExpiry, logOTP } from '../helpers/otpHelper.js';
import { sendOTPEmail } from './emailService.js';

const registerTutor = async ({ fullName, email, password, certificatePath, certificatePublicId }) => {
    email = email.toLowerCase().trim();
    const existing = await Tutor.findOne({ email });

    if (existing && existing.isVerified) {
        throw new Error('Email already registered as tutor');
    }

    if (existing && !existing.isVerified) {
        await Tutor.deleteOne({ email });
    }

    const hashed = await hashPassword(password);
    const tutor = await Tutor.create({
        fullName,
        email,
        password: hashed,
        isVerified: false,
        isApproved: false,
        approvalStatus: 'pending',
        certificatePath: certificatePath || null,
        certificatePublicId: certificatePublicId || null
    });

    const otp = generateOTP();
    logOTP(email, otp, 'TUTOR SIGNUP');
    
    await OTP.deleteMany({ email, purpose: "signup" });
    await OTP.create({ email, otp, purpose: "signup", expiresAt: otpExpiry() });
    await sendOTPEmail(email, otp, 'signup');

    return tutor;
};

const verifyOtp = async (email, otp, purpose = "signup") => {
    email = email.toLowerCase().trim();
    otp = otp.trim();
    
    const record = await OTP.findOne({ email, otp, purpose });
    
    if (!record) throw new Error('Invalid otp');
    if (record.expiresAt < new Date()) throw new Error('Otp expired. Please resend');

    if (purpose === 'signup') {
        await Tutor.updateOne({ email }, { isVerified: true });
    }
    await OTP.deleteMany({ email, purpose });
}

const resendOtp = async (email, purpose = "signup") => {
    const tutor = await Tutor.findOne({ email });
    if (!tutor) throw new Error('Email not found');

    const otp = generateOTP();
    logOTP(email, otp, 'TUTOR RESEND');
    
    await OTP.deleteMany({ email, purpose });
    await OTP.create({ email, otp, purpose, expiresAt: otpExpiry() });
    await sendOTPEmail(email, otp, purpose);
}

const loginTutor = async (email, password) => {
    email = email.toLowerCase().trim();
    const tutor = await Tutor.findOne({ email });

    if (!tutor) throw new Error('No account found with this email');
    if (!tutor.isVerified) throw new Error('Please verify your email first');
    if (tutor.isBlocked) throw new Error('Your account has been blocked. Please contact support.');

    const match = await comparePassword(password, tutor.password);
    if (!match) throw new Error('Incorrect password');

    return tutor;
}

const forgotPassword = async (email) => {
    const tutor = await Tutor.findOne({ email });
    if (!tutor) throw new Error('No Account found');

    const otp = generateOTP();
    logOTP(email, otp, 'TUTOR PASSWORD RESET');
    
    await OTP.deleteMany({ email, purpose: "reset" });
    await OTP.create({ email, otp, purpose: "reset", expiresAt: otpExpiry() });
    await sendOTPEmail(email, otp, 'reset');
}

const resetPassword = async (email, newPassword) => {
    email = email.toLowerCase().trim();

    const hashed = await hashPassword(newPassword);
    await Tutor.updateOne({ email }, { password: hashed })
}

const sendEmailChangeOTP = async (email) => {
    email = email.toLowerCase().trim();

    const otp = generateOTP();
    logOTP(email, otp, 'TUTOR EMAIL CHANGE');
    
    await OTP.deleteMany({ email, purpose: 'email-change' });
    await OTP.create({ email, otp, purpose: 'email-change', expiresAt: otpExpiry() });
    await sendOTPEmail(email, otp, 'email-change');
};

const verifyEmailChangeOTP = async (email, otp) => {
    email = email.toLowerCase().trim();

    const record = await OTP.findOne({ email, otp, purpose: 'email-change' });
    if (!record) throw new Error('Invalid OTP');
    if (record.expiresAt < new Date()) throw new Error('OTP expired. Please resend');

    await OTP.deleteMany({ email, purpose: 'email-change' });
};

export {
    registerTutor,
    verifyOtp,
    resendOtp,
    loginTutor,
    forgotPassword,
    resetPassword,
    sendEmailChangeOTP,
    verifyEmailChangeOTP,
    hashPassword,
    comparePassword
};

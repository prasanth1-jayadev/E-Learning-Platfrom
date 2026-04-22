import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Check if we're in development mode (no email credentials)
const isDevelopment = !process.env.MAIL_USER || !process.env.MAIL_PASS;

let transporter = null;

if (!isDevelopment) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    transporter.verify(function (error, success) {
        if (error) {
            console.log('Email error:', error.message);
            console.log('Running in development mode - OTPs will be logged to console');
        } else {
            console.log('Email service ready');
        }
    });
} else {
    console.log('Development mode - OTPs will be logged to console');
}

const sendOTPEmail = async (to, otp, purpose = "signup") => {
    // Always log OTP to console for development
    console.log('\n=================================');
    console.log('📧 OTP EMAIL');
    console.log('=================================');
    console.log('To:', to);
    console.log('Purpose:', purpose);
    console.log('OTP Code:', otp);
    console.log('=================================\n');
    
    // Skip actual email sending for now
    return;
}

export { sendOTPEmail };


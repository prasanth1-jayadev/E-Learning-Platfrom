import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const sendOTPEmail = async (to, otp, purpose = "signup") => {
    try {
        let subject = '';
        let heading = '';
        let message = '';

        if (purpose === 'signup') {
            subject = 'Verify Your Email - Learnify';
            heading = 'Email Verification';
            message = 'Thank you for signing up! Please use the OTP below to verify your email address.';
        } else if (purpose === 'reset') {
            subject = 'Reset Your Password - Learnify';
            heading = 'Password Reset';
            message = 'You requested to reset your password. Please use the OTP below to proceed.';
        } else if (purpose === 'email-change') {
            subject = 'Verify Your New Email - Learnify';
            heading = 'Email Change Verification';
            message = 'You requested to change your email address. Please use the OTP below to verify.';
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 50px auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #333; margin: 0; font-size: 28px; }
                    .content { text-align: center; }
                    .content p { color: #666; font-size: 16px; line-height: 1.6; }
                    .otp-box { background-color: #f8f9fa; border: 2px dashed #00d9b1; padding: 20px; margin: 30px 0; border-radius: 8px; }
                    .otp { font-size: 36px; font-weight: bold; color: #00d9b1; letter-spacing: 8px; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                    .footer p { color: #999; font-size: 14px; }
                    .brand { color: #00d9b1; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${heading}</h1>
                    </div>
                    <div class="content">
                        <p>${message}</p>
                        <div class="otp-box">
                            <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
                            <div class="otp">${otp}</div>
                        </div>
                        <p>This OTP will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>Best regards,<br><span class="brand">Learnify</span> Team</p>
                        <p style="font-size: 12px;">Learn Today, Lead Tomorrow.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"Learnify" <${process.env.MAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });

    } catch (error) {
        console.log('Email send failed:', error.message);
    }
}

export { sendOTPEmail };


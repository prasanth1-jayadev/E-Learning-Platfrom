const generateOTP = () => {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    return otp;
}

const otpExpiry = () => {
    return new Date(Date.now() + 10 * 60 * 1000);
};

const logOTP = (email, otp, purpose) => {
    console.log('OTP:', otp);
};

export { generateOTP, otpExpiry, logOTP };

const generateOTP = () => {
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    console.log('\n🔐 OTP GENERATED:', otp, '\n');
    return otp;
}

const otpExpiry = () => {
    return new Date(Date.now() + 10 * 60 * 1000);
};

export { generateOTP, otpExpiry };

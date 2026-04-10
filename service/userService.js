
const User = require('../models/User');
const OTP = require('../models/OTP');
const {hashPassword , comparePassword} = require('../helpers/passwordHelper');
const {generateOTP , otpExpiry}  = require('../helpers/otpHelper');
const {sendOTPEmail}  = require('./emailService');



const registerUser = async ({ fullName, email, password }) => {
    email = email.toLowerCase().trim()
    const existing = await User.findOne({ email });

    if (existing && existing.isVerified) {
        throw new Error('Email already exist');
    }
    if (existing && !existing.isVerified) {
        await User.deleteOne({ email });
    }
    const hashed = await hashPassword(password);
    await User.create({ fullName, email, password:hashed, isVerified:false });

   const otp = generateOTP();
   await OTP.deleteMany({email, purpose:"signup"})
   await OTP.create({email,otp, purpose:"signup", expiresAt:otpExpiry()});
   await sendOTPEmail(email,otp, 'signup');

}




const verifyOtp = async (email, otp , purpose ="signup") =>{
        email = email.toLowerCase().trim();

    const  record = await OTP.findOne({email, otp, purpose});
    if(!record) throw new Error('Invalid OTP');

    if(record.expiresAt < new Date()) throw new Error('OTP expire . please resend');


    if(purpose === "signup"){
        await User.updateOne({email}, {isVerified:true})
    }

    await OTP.deleteMany({email , purpose});

}


const resendOtp = async(email , purpose="signup")=>{
    email = email.toLowerCase().trim();
    const user= await User.findOne({email});
    if(!user) throw new Error('Email not found');
    

     const otp = generateOTP()
     await OTP.deleteMany({email,purpose});
     await OTP .create({email, otp ,purpose,expiresAt:otpExpiry()})
     await sendOTPEmail(email,otp, purpose);

}




const loginUser = async (email, password) => {
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) throw new Error('No account found');

    const match = await comparePassword(password, user.password);

    if (!match) throw new Error('Incorrect password');

    return user;
};



const   forgotPassword = async(email)=>{
    email = email.toLowerCase().trim()
    const user = await User.findOne({email});
    if(!user)throw new Error('no account found in this email');

    const otp = generateOTP()
    await OTP.deleteMany({email,purpose:'reset'}) ;
    await OTP.create({email,otp,purpose:'reset' , expiresAt:otpExpiry()}) ;
    await sendOTPEmail(email,otp , 'reset');
    
}   



const resetPassword = async (email, newPassword) =>{
      email = email.toLowerCase().trim()
    const hashed =await hashPassword(newPassword);
    await User.updateOne({email},{password:hashed})
}


const getUserByEmail = async (email) => {
    return await User.findOne({ email });
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserByEmail
};





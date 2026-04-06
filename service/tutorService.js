

const Tutor = require('../models/Tutor');
const OTP = require('../models/OTP')

const {hashPassword , comparePassword} = require('../helpers/passwordHelper');
const {generateOTP, otpExpiry} = require('../helpers/otpHelper');
const {sendOTPEmail} =require ('./emailService');


// register Tutor

const registerTutor = async ({ fullName, email, password }) => {
    email = email.toLowerCase().trim(); 
    const existing = await Tutor.findOne({ email });
    if (existing && existing.isVerified) {
        throw new Error('email already registered');
    }
    if (existing && !existing.isVerified) {
        await Tutor.deleteOne({ email });
    }
    const hashed = await hashPassword(password);
    await Tutor.create({
        fullName,
        email,
        password: hashed,
        isVerified: false,
        isApproved: false
    });

    const otp = generateOTP()
    console.log(otp)
    await OTP.deleteMany({email, purpose:"signup"});
    await OTP.create({email,otp, purpose:"signup",expiresAt:otpExpiry()})
    await sendOTPEmail(email,otp,'signup')

}


// verifyOtp


const verifyOtp = async (email, otp, purpose="signup") =>{
    const record = await OTP.findOne({email,otp, purpose});
    if(!record) throw new Error('Invalid otp')
    if(record.expiresAt<new Date()) throw new Error('Otp expired . please resend ');

   
   if(purpose === 'signup'){
    await Tutor.updateOne({email}, {isVerified:true});
   }
   await OTP.deleteMany({email,purpose});


}



const resendOtp = async(email,purpose = "signup") =>{
    const tutor =await Tutor.findOne({email});
    if(!tutor) throw new Error('Email not found ');


    const otp = generateOTP();
    await OTP.deleteMany({email , purpose});
    await OTP.create({email , otp , purpose , expiresAt:otpExpiry()})
    await sendOTPEmail(email , otp , purpose);

}



const loginTutor = async (email , password) =>{
    const tutor = await Tutor.findOne({email});
    if(!tutor) throw new Error('No email found');
    if(!tutor.isVerified) throw new Error('please verify the email');


    const match = await comparePassword(password,tutor.password);
    if(!match) throw new Error('Incorrect Password');


    return tutor ;
}


const forgotPassword = async (email) =>{
    const tutor = await Tutor.findOne({email});
    if(!tutor) throw new Error('No Account found');


    const otp = generateOTP();
    await  OTP.deleteMany({email ,purpose:"reset"});
    await OTP.create({email ,otp , purpose:"reset",expiresAt:otpExpiry()});
    await sendOTPEmail(email , otp , 'reset'); 
}




const resetPassword =async(email , newPassword) =>{
    email = email.toLowerCase().trim();

    const hashed = await hashPassword(newPassword);
    await Tutor.updateOne({email},{password:hashed})
}


const PendingTutor = require('../models/PendingTutor');

const registerPendingTutor = async ({ fullName, email, password, certificatePath, status }) => {
  email = email.toLowerCase().trim();

  const existing = await PendingTutor.findOne({ email });
  if (existing) {
    throw new Error('Request already submitted. Wait for admin approval.');
  }

  
  const hashed = await hashPassword(password);

  const pending = new PendingTutor({
    fullName,
    email,
    password: hashed, 
    certificatePath,
    status
  });

  return await pending.save();
};




module.exports = {
  registerTutor,
  verifyOtp,
  resendOtp,
  loginTutor,
  forgotPassword,
  resetPassword,
  registerPendingTutor,
};


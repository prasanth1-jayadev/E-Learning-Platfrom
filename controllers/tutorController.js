const tutorService = require('../service/tutorService');

const getSignup   = (req, res) => res.render('tutor/signup');
const getLogin    = (req, res) => res.render('tutor/login');
const getOtp      = (req, res) => res.render('tutor/otp');
const getForgotPassword = (req, res) => res.render('tutor/forgot-password');
const getResetPassword  = (req, res) => res.render('tutor/reset-password');
const getDashboard = async (req, res) => {
    try {
        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(req.session.tutorId);
        
        if (!tutor) {
            return res.redirect('/tutor/login');
        }
        
        res.render('tutor/dashboard', { 
            tutor,
            approvalStatus: tutor.approvalStatus,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/tutor/login');
    }
};
const getProfile = async (req, res) => {
    try {
        const Tutor = require('../models/Tutor');
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
    const Tutor = require('../models/Tutor');
    
    const tutor = await Tutor.findById(req.session.tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Update profile fields
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
    const Tutor = require('../models/Tutor');
    const tutorService = require('../service/tutorService');
    
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
    const Tutor = require('../models/Tutor');
    const tutorService = require('../service/tutorService');
    
    // Verify OTP
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
    const tutorService = require('../service/tutorService');
    await tutorService.sendEmailChangeOTP(email);
    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(400).json({ message: error.message });
  }
};



const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const certificateFile = req.file;

    // Serverside vali
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

    await tutorService.registerTutor({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      certificatePath: certificateFile.path
    });

    req.session.otpEmail = email.trim();
    req.session.otpPurpose = 'signup';

    res.json({ redirect: '/tutor/verify-otp' });

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};





const postOtp = async (req,res)=>{
  try{
    const{otp} = req.body;
    const email =req.session.otpEmail;
    const purpose = req.session.otpPurpose ||'signup';


    if(!email){
      return res.status(400).json({message:"session - expired"})
    }
    await tutorService.verifyOtp(email,otp,purpose);

    if(purpose === 'reset'){
      req.session.resetEmail =email;
      req.session.allowReset = true;
      req.session.otpEmail=null;


      return res.json({redirect :'/tutor/reset-password'})
    }
    req.session.otpEmail= null;
    res.json({ redirect: '/tutor/dashboard' })
  }catch(err){
    console.error(err)
    res.status(400).json({message:err.message});
  }
}


const resendOtp=async(req,res)=>{
  try{
    const email = req.session.otpEmail;
    const purpose = req.session.otpPurpose ||'signup'


    if(!email){
      return res.status(400).json({message:'session expired'})
    }
    await tutorService.resendOtp(email,purpose);
    res.json({success:true})
  }catch(err){
    console.error(err)
    res.status(400).json({message:err.message});
  }
}



const postLogin =async (req,res)=>{
  try{
    const {email ,password}=req.body;
     const tutor =await tutorService.loginTutor(email, password);

     req.session.tutorId = tutor._id
     
     res.json({redirect:'/tutor/dashboard'});

  }catch(err){
    console.error(err)
    res.status(400).json({message:err.message})
  }
}

const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/tutor/login');
  });
};




const postForgotPassword = async (req,res)=>{
  try{
    const {email}=req.body
    await tutorService.forgotPassword(email);

    req.session.otpEmail =email;
    req.session.otpPurpose ='reset'

    res.json ({redirect:'/tutor/verify-otp'});

  }catch(err){
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



module.exports = {
  getSignup, postSignup,
  getLogin, postLogin, logout,
  getOtp, postOtp, resendOtp,
  getForgotPassword, postForgotPassword,
  getResetPassword, postResetPassword, 
  getDashboard, getProfile,
  postUpdateProfile, postSendEmailChangeOTP, postVerifyEmailChange, postResendEmailOTP
};

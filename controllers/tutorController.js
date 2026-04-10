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



const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const certificateFile = req.file;

    // Server-side validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate full name (only letters and single spaces between words)
    const nameRegex = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({ message: 'Full name can only contain letters and single spaces between words' });
    }

    // Validate name length
    if (fullName.trim().length < 2 || fullName.trim().length > 50) {
      return res.status(400).json({ message: 'Full name must be between 2 and 50 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
    }

    // Validate certificate file
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
};

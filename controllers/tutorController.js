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

const getCourses = async (req, res) => {
    try {
        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(req.session.tutorId);
        
        if (!tutor) {
            return res.redirect('/tutor/login');
        }
        
        res.render('tutor/courses', { 
            tutor,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'courses'
        });
    } catch (error) {
        console.error('Courses error:', error);
        res.redirect('/tutor/login');
    }
};

const getStudents = async (req, res) => {
    try {
        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(req.session.tutorId);
        
        if (!tutor) {
            return res.redirect('/tutor/login');
        }
        
        res.render('tutor/students', { 
            tutor,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'students'
        });
    } catch (error) {
        console.error('Students error:', error);
        res.redirect('/tutor/login');
    }
};

const getEarnings = async (req, res) => {
    try {
        const Tutor = require('../models/Tutor');
        const tutor = await Tutor.findById(req.session.tutorId);
        
        if (!tutor) {
            return res.redirect('/tutor/login');
        }
        
        res.render('tutor/earnings', { 
            tutor,
            isApproved: tutor.approvalStatus === 'approved',
            currentPage: 'earnings'
        });
    } catch (error) {
        console.error('Earnings error:', error);
        res.redirect('/tutor/login');
    }
};


const { hashPassword } = require('../helpers/passwordHelper');

const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const certificateFile = req.file;

    if (!certificateFile) {
      return res.status(400).json({ message: 'Please upload your certificate' });
    }

    
    await tutorService.registerTutor({
      fullName,
      email,
      password,
      certificatePath: certificateFile.path
    });

    req.session.otpEmail = email;
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
  getDashboard, getProfile, getCourses, getStudents, getEarnings,hashPassword
};

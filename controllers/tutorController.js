const tutorService = require('../service/tutorService');

const getSignup   = (req, res) => res.render('tutor/signup');
const getLogin    = (req, res) => res.render('tutor/login');
const getOtp      = (req, res) => res.render('tutor/otp');
const getForgotPassword = (req, res) => res.render('tutor/forgot-password');
const getResetPassword  = (req, res) => res.render('tutor/reset-password');
const getDashboard = (req, res) => res.render('tutor/dashboard');
const getProfile   = (req, res) => res.render('tutor/profile');


const { hashPassword } = require('../helpers/passwordHelper');

const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const certificateFile = req.file;

    if (!certificateFile) {
      return res.status(400).json({ message: 'Please upload your certificate' });
    }

    const hashedPassword = await hashPassword(password);

    await tutorService.registerPendingTutor({
      fullName,
      email,
      password: hashedPassword,
      certificatePath: certificateFile.path,
      status: 'pending'
    });

    // ❗ Generate OTP here
    await tutorService.generateSignupOtp(email);

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
  getResetPassword, postResetPassword, getDashboard, getProfile
 
};

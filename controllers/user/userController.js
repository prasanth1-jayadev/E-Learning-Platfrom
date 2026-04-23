import * as userService from '../../service/userService.js';
import User from '../../models/User.js';
import Course from '../../models/Course.js';


const getSignup         = (req, res) => res.render('user/signup');
const getLogin          = (req, res) => res.render('user/login');
const getOtp            = (req, res) => res.render('user/otp');
const getForgotPassword = (req, res) => res.render('user/forgot-password');
const getResetPassword  = (req, res) => res.render('user/reset-password');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.redirect('/user/login');
    }
    
    res.render('user/profile', { user });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.redirect('/user/home');
  }
};

const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.redirect('/user/login');
    }
    
    res.render('user/edit-profile', { user });
  } catch (error) {
    console.error('Error loading edit profile:', error);
    res.redirect('/user/profile');
  }
};

const postUpdateProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fullName = fullName.trim();
    user.phone = phone ? phone.trim() : null;
    await user.save();
    
    res.json({ success: true, message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message });
  }
};

const postSendEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;
    
    const newEmailTrimmed = newEmail.trim().toLowerCase();
    
    const existingUser = await User.findOne({ email: newEmailTrimmed });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    await userService.sendEmailChangeOTP(newEmailTrimmed);
    
    res.json({ success: true, message: 'OTP sent to new email' });

  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(400).json({ message: error.message });
  }
};

const postVerifyEmailChange = async (req, res) => {
  try {
    const { otp, newEmail } = req.body;
    
    await userService.verifyEmailChangeOTP(newEmail, otp);
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = newEmail.trim().toLowerCase();
    await user.save();
    
    res.json({ success: true, message: 'Email updated successfully' });

  } catch (error) {
    console.error('Verify email change error:', error);
    res.status(400).json({ message: error.message });
  }
};

const postResendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    await userService.sendEmailChangeOTP(email);
    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(400).json({ message: error.message });
  }
};


const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    
    const nameRegex = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({ message: 'Full name can only contain letters' });
    }

  
    if (fullName.trim().length < 2 || fullName.trim().length > 50) {
      return res.status(400).json({ message: 'Full name must be between 2 and 50 characters' });
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
    }

    await userService.registerUser({ fullName: fullName.trim(), email: email.trim(), password });

    req.session.otpEmail   = email.trim();
    req.session.otpPurpose = 'signup';

    res.json({ redirect: '/user/verify-otp' });
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: err.message });
  }
};

const postOtp = async (req, res) => {
  try {
    const { otp }  = req.body;
    const email    = req.session.otpEmail;
    const purpose  = req.session.otpPurpose || 'signup';

    if (!email) {
      return res.status(400).json({ message: 'Session expired. Please try again.' });
    }

    await userService.verifyOtp(email, otp, purpose);

    if (purpose === 'reset') {
      req.session.resetEmail = email;
      req.session.allowReset = true;
      req.session.otpEmail   = null;
      return res.json({ redirect: '/user/reset-password' });
    }

  
    const user = await userService.getUserByEmail(email);
    req.session.userId   = user._id;
    req.session.otpEmail = null;
    res.json({ redirect: '/user/home' });
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: err.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const email   = req.session.otpEmail;
    const purpose = req.session.otpPurpose || 'signup';

    if (!email) {
      return res.status(400).json({ message: 'Session expired.' });
    }

    await userService.resendOtp(email, purpose);
    res.json({ success: true });
  } catch (err) {
    console.error(err)
    console.log('resend otp error:',err)
    res.status(400).json({ message: err.message });
  }
};


const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userService.loginUser(email, password);

    if (!user.isVerified) {
      req.session.otpEmail = email;
      req.session.otpPurpose = 'signup';

      return res.json({ redirect: '/user/verify-otp' });
    }

    req.session.userId = user._id;

    res.json({ redirect: '/user/home' });

  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalCourses = await Course.countDocuments({ isPublished: true });
    const courses = await Course.find({ isPublished: true })
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCourses / limit);

    res.render('user/courses', {
      courses,
      currentPage: page,
      totalPages,
      totalCourses
    });

  } catch (error) {
    console.error(error);
    res.render('user/courses', {
      courses: [],
      currentPage: 1,
      totalPages: 1,
      totalCourses: 0
    });
  }
};

const getCourseDetail = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).populate('tutor', 'fullName bio avatar');

    if (!course) {
      return res.redirect('/user/courses');
    }

    res.render('user/course-detail', { course });

  } catch (error) {
    console.error(error);
    res.redirect('/user/courses');
  }
};


 const getHome = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .limit(4); 

    res.render('user/home', { courses });

  } catch (error) {
    console.log(error);
    res.render('user/home', { courses: [] });
  }
};



const getLanding = async (req, res) => {
  try {
    const courses = await Course.find({status:'published'})
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .limit(8);
        
    res.render('user/landing', { courses });
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.render('user/landing', { courses: [] });
  }
};



const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/user/login');
  });
};

const postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await userService.forgotPassword(email);

    req.session.otpEmail   = email;
    req.session.otpPurpose = 'reset';

    res.json({ redirect: '/user/verify-otp' });
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: err.message });
  }
};

const postResetPassword = async (req, res) => {
  try {
    if (!req.session.allowReset) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const { password } = req.body;
    await userService.resetPassword(req.session.resetEmail, password);

    req.session.allowReset = null;
    req.session.resetEmail = null;

    res.json({ redirect: '/user/login' });
  } catch (err) {
    console.error(err)
    res.status(400).json({ message: err.message });
  }
};

export {
  getLanding,
  getHome, getCourses, getCourseDetail, getSignup, postSignup,
  getLogin, postLogin, logout,
  getOtp, postOtp, resendOtp,
  getForgotPassword, postForgotPassword,
  getResetPassword, postResetPassword,
  getProfile, getEditProfile, postUpdateProfile, 
  postSendEmailChangeOTP, postVerifyEmailChange, postResendEmailOTP
};

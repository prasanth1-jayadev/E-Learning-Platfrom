const userService = require('../service/userService');


const getLanding        = (req, res) => res.render('user/landing');
const getHome           = (req, res) => res.render('user/home');
const getSignup         = (req, res) => res.render('user/signup');
const getLogin          = (req, res) => res.render('user/login');
const getOtp            = (req, res) => res.render('user/otp');
const getForgotPassword = (req, res) => res.render('user/forgot-password');
const getResetPassword  = (req, res) => res.render('user/reset-password');
const getProfile = async (req, res) => {
  try {
    const User = require('../models/User');
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
    const User = require('../models/User');
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
    const User = require('../models/User');
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update name and phone
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
    const User = require('../models/User');
    
    const newEmailTrimmed = newEmail.trim().toLowerCase();
    
    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmailTrimmed });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Send OTP to new email
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
    const User = require('../models/User');
    
    // Verify OTP
    await userService.verifyEmailChangeOTP(newEmail, otp);
    
    // Update user with new email
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

module.exports = {
  getLanding,
  getHome, getSignup, postSignup,
  getLogin, postLogin, logout,
  getOtp, postOtp, resendOtp,
  getForgotPassword, postForgotPassword,
  getResetPassword, postResetPassword,
  getProfile, getEditProfile, postUpdateProfile, 
  postSendEmailChangeOTP, postVerifyEmailChange, postResendEmailOTP
};

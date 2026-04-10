const userService = require('../service/userService');


const getLanding        = (req, res) => res.render('user/landing');
const getHome           = (req, res) => res.render('user/home');
const getSignup         = (req, res) => res.render('user/signup');
const getLogin          = (req, res) => res.render('user/login');
const getOtp            = (req, res) => res.render('user/otp');
const getForgotPassword = (req, res) => res.render('user/forgot-password');
const getResetPassword  = (req, res) => res.render('user/reset-password');
const getProfile = (req, res) => res.render('user/profile');


const postSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

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
  getResetPassword, postResetPassword,getProfile
};

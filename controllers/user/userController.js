import * as userService from '../../service/userService.js';
import * as categoryService from '../../service/categoryService.js';
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

const postChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ message: 'Password must contain uppercase, lowercase, and number' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await userService.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await userService.hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ message: error.message });
  }
};

const postUploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update avatar with Cloudinary URL
    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, message: 'Profile photo updated successfully', avatar: req.file.path });
  } catch (error) {
    console.error('Upload avatar error:', error);
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
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';

    // Get categories
    let categories = [];
    try {
      categories = await categoryService.getListedCategories();
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = []; 
    }

    // Build filter query
    const filter = { 
      isPublished: true,
      // Exclude the specific psychology course
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    };
    
    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Build sort query
    let sortQuery = {};
    switch (sort) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'price-low':
        sortQuery = { price: 1 };
        break;
      case 'price-high':
        sortQuery = { price: -1 };
        break;
      case 'title-az':
        sortQuery = { title: 1 };
        break;
      case 'title-za':
        sortQuery = { title: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const totalCourses = await Course.countDocuments(filter);
    const courses = await Course.find(filter)
      .populate('tutor', 'fullName avatar bio')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCourses / limit);

    res.render('user/courses', {
      courses,
      categories,
      currentPage: page,
      totalPages,
      totalCourses,
      search,
      category,
      sort
    });

  } catch (error) {
    console.error(error);
    res.render('user/courses', {
      courses: [],
      categories: [],
      currentPage: 1,
      totalPages: 1,
      totalCourses: 0,
      search: '',
      category: '',
      sort: 'newest'
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
    const user = await User.findById(req.session.userId);
    const courses = await Course.find({ 
      isPublished: true,
      // Exclude the specific psychology course
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    })
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .limit(4); 

    res.render('user/home', { courses, user });

  } catch (error) {
    console.log(error);
    res.render('user/home', { courses: [], user: null });
  }
};

const getLanding = async (req, res) => {
  try {
    const courses = await Course.find({
      status:'published',
      // Exclude the specific psychology course
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    })
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

const getTutors = async (req, res) => {
  try {
    // Import Tutor model
    const Tutor = (await import('../../models/Tutor.js')).default;
    
    // Get query parameters
    const search = req.query.search || '';
    const sort = req.query.sort || 'newest';
    
    // Build filter query
    const filter = { 
      approvalStatus: 'approved'
    };
    
    // Add search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { subjects: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort query
    let sortQuery = {};
    switch (sort) {
      case 'name-az':
        sortQuery = { fullName: 1 };
        break;
      case 'name-za':
        sortQuery = { fullName: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { createdAt: -1 };
        break;
    }
    
    // Get tutors from database
    const tutors = await Tutor.find(filter)
      .select('fullName email bio subjects phone avatar')
      .sort(sortQuery)
      .lean();
    
    // Add display data to each tutor
    const tutorsWithData = await Promise.all(tutors.map(async(tutor, index) => {
      // Generate consistent rating based on tutor ID
      const ratings = [5.0, 4.9, 4.8, 4.7, 4.6, 4.5];
      const rating = ratings[index % ratings.length];
      const reviewCount = 50 - (index * 2);
      
      // Get REAL course count from database
      const courseCount = await Course.countDocuments({ 
        tutor: tutor._id,
        isPublished: true
      });
      
      const hourlyRate = 250 - (index * 15);
      
      return {
        ...tutor,
        rating: rating,
        reviewCount: reviewCount > 10 ? reviewCount : 15,
        courseCount: courseCount,
        hourlyRate: hourlyRate > 100 ? hourlyRate : 150,
        profileImage: tutor.avatar,
        bio: tutor.bio || 'Experienced tutor specializing in various subjects.'
      };
    }));
    
    // Apply sort for rating and price (after data is added)
    if (sort === 'rating-high') {
      tutorsWithData.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'rating-low') {
      tutorsWithData.sort((a, b) => a.rating - b.rating);
    } else if (sort === 'price-high') {
      tutorsWithData.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sort === 'price-low') {
      tutorsWithData.sort((a, b) => a.hourlyRate - b.hourlyRate);
    }
    
    res.render('user/tutors', {
      tutors: tutorsWithData,
      search,
      sort
    });
  } catch (error) {
    console.error('Get tutors error:', error);
    res.render('user/tutors', {
      tutors: [],
      search: '',
      sort: 'newest'
    });
  }
};

const getTutorDetail = async (req, res) => {
  try {
    const Tutor = (await import('../../models/Tutor.js')).default;
    
    // Get tutor by ID
    const tutor = await Tutor.findById(req.params.id).lean();
    
    if (!tutor) {
      return res.redirect('/user/tutors');
    }
    
    // Get courses by this tutor
    const courses = await Course.find({ 
      tutor: req.params.id,
      isPublished: true 
    })
    .select('title description price thumbnail lessons')
    .lean();
    
    // Fixed rating data for consistency
    const tutorDataMap = {
      'riveratutor': { rating: 5.0, reviewCount: 48 },
      'alextutor': { rating: 4.9, reviewCount: 42 },
      'davidtutor': { rating: 4.8, reviewCount: 38 },
      'elna rodrigues': { rating: 4.7, reviewCount: 35 }
    };
    
    const tutorKey = tutor.fullName.toLowerCase();
    const ratingData = tutorDataMap[tutorKey] || { rating: 4.5, reviewCount: 20 };
    
    res.render('user/tutor-detail', {
      tutor: {
        ...tutor,
        ...ratingData
      },
      courses
    });
  } catch (error) {
    console.error('Get tutor detail error:', error);
    res.redirect('/user/tutors');
  }
};

export {
  getLanding,
  getHome, getCourses, getCourseDetail, getTutors, getTutorDetail, getSignup, postSignup,
  getLogin, postLogin, logout,
  getOtp, postOtp, resendOtp,
  getForgotPassword, postForgotPassword,
  getResetPassword, postResetPassword,
  getProfile, getEditProfile, postUpdateProfile, 
  postSendEmailChangeOTP, postVerifyEmailChange, postResendEmailOTP,
  postChangePassword, postUploadAvatar
};

import * as userService from '../../service/userService.js';
import User from '../../models/User.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect('/user/login');
    }

    res.render('user/profile', { user, currentPage: 'profile' });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.redirect('/user/home');
  }
};

const postUpdateProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const nameRegex = /^(?=.{2,50}$)[a-zA-Z]+(?: [a-zA-Z]+)*$/;
    const phoneRegex = /^[0-9]{10}$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({ message: 'Please enter a valid name' });
    }

    if (phone && !phoneRegex.test(phone.trim())) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    }

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

const postUploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');
    user.avatar = result.secure_url;
    await user.save();

    res.json({ success: true, message: 'Profile photo updated successfully', avatar: result.secure_url });
  } catch (error) {
    console.error('Upload avatar error:', error);
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


const getMyCourses = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses',
        populate: {
          path: 'tutor',
          select: 'fullName avatar'
        }
      });

    res.render('user/my-courses', {
      user: user,
      courses: user.enrolledCourses || [],
      currentPage: 'my-courses'
    });

  } catch (error) {
    console.error('Error fetching my courses:', error);
    res.redirect('/user/profile');
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

export {
  getProfile,
  postUpdateProfile,
  postUploadAvatar,
  postSendEmailChangeOTP,
  postVerifyEmailChange,
  postResendEmailOTP,
  postChangePassword,
  getMyCourses
};

import * as userService from '../../service/userService.js';
import User from '../../models/User.js';

// Get Profile
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

// Get Edit Profile
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

// Update Profile
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

// Upload Avatar
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

// Send Email Change OTP
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

// Verify Email Change
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

// Resend Email OTP
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

// Change Password
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
  getEditProfile,
  postUpdateProfile,
  postUploadAvatar,
  postSendEmailChangeOTP,
  postVerifyEmailChange,
  postResendEmailOTP,
  postChangePassword
};

import User from '../models/User.js';
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';

export const checkIfAlreadyPurchased = async (userId, courseId) => {
  const user = await User.findById(userId);
  if (!user) return false;
  
  return user.enrolledCourses.some(id => id.toString() === courseId.toString());
};

export const enrollUserInCourse = async (userId, courseId, paymentData) => {
  const alreadyEnrolled = await checkIfAlreadyPurchased(userId, courseId);
  if (alreadyEnrolled) {
    throw new Error('Already enrolled in this course');
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { enrolledCourses: courseId }
  });

  await Course.findByIdAndUpdate(courseId, {
    $addToSet: { enrolledStudents: userId }
  });

  const payment = new Payment({
    user: userId,
    course: courseId,
    orderId: paymentData.orderId,
    paymentId: paymentData.paymentId,
    signature: paymentData.signature,
    amount: paymentData.amount,
    status: 'completed'
  });

  await payment.save();

  return payment;
};

export const getPaymentHistory = async (userId) => {
  return await Payment.find({ user: userId })
    .populate('course', 'title thumbnail price')
    .sort({ createdAt: -1 });
};

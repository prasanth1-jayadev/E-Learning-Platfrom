import User from '../models/User.js';
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import { addCredit } from './walletService.js';

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

  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
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

  const tutorEarnings = paymentData.amount * 0.8;
  await addCredit(
    course.tutor,
    tutorEarnings,
    `Course enrollment: ${course.title}`,
    payment._id,
    courseId
  );

  return payment;
};

export const getPaymentHistory = async (userId) => {
  return await Payment.find({ user: userId })
    .populate('course', 'title thumbnail price')
    .sort({ createdAt: -1 });
};

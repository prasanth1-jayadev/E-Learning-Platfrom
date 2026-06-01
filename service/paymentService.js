import User from '../models/User.js';
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import { addCredit } from './walletService.js';
import Conversation from '../models/Conversation.js'
import { sendNotification } from './notificationService.js';



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

  // Add the student to the course's group chat (or create it if it doesn't exist)
  await Conversation.findOneAndUpdate(
    { type: 'group', courseId: courseId },
    {
      $setOnInsert: { tutorId: course.tutor },
      $addToSet: { participants: { userId: userId, isActive: true } }
    },
    { upsert: true }
  );
  const student = await User.findById(userId);
  await sendNotification({
    recipientId: course.tutor,
    recipientType: 'tutor',
    title: 'Course Purchased!',
    message: `Student "${student.fullName}" has purchased your course: "${course.title}"`,
    type: 'course_purchased',
    relatedId: course._id
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

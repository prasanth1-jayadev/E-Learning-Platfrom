import razorpay from "../../config/razorpay.js";
import crypto from "crypto";
import Course from "../../models/Course.js";
import User from "../../models/User.js";
import { enrollUserInCourse } from "../../service/paymentService.js";
import * as cartService from "../../service/cartService.js";
import Payment from "../../models/Payment.js";

export const createOrder = async (req, res) => {
  try {
    const { courseIds } = req.body; // Now accepts array of course IDs
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    // Calculate total amount
    let totalAmount = 0;
    const courses = await Course.find({ _id: { $in: courseIds } });
    
    for (const course of courses) {
      if (!course.isPublished) {
        return res.status(400).json({ success: false, message: `${course.title} is not available` });
      }
      totalAmount += course.price;
    }

    if (totalAmount === 0) {
      return res.status(400).json({ success: false, message: "Invalid order amount" });
    }

    const options = {
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
      notes: {
        courseIds: courseIds.join(','),
        userId: userId
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
      totalAmount
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseIds // Now accepts array of course IDs
    } = req.body;

    const userId = req.session.userId;

    console.log('Payment verification started:', { razorpay_order_id, razorpay_payment_id, userId });

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.log('Payment signature verification failed');
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    console.log('Payment signature verified successfully');

    // Enroll user in all courses
    let totalAmount = 0;
    for (const courseId of courseIds) {
      const course = await Course.findById(courseId);
      if (course) {
        totalAmount += course.price;
        await enrollUserInCourse(userId, courseId, {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount: course.price
        });
      }
    }

    console.log('User enrolled in courses, total amount:', totalAmount);

    // Clear cart after successful payment
    await cartService.clearCart(userId);

    const redirectUrl = `/user/payment/success?orderId=${razorpay_order_id}&paymentId=${razorpay_payment_id}&amount=${totalAmount}`;
    console.log('Sending redirect URL:', redirectUrl);

    res.json({
      success: true,
      message: "Payment verified and enrolled successfully",
      redirectUrl: redirectUrl
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed"
    });
  }
};

export const enrollFree = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (course.price !== 0) {
      return res.status(400).json({ success: false, message: "This is not a free course" });
    }

    await enrollUserInCourse(userId, courseId, {
      orderId: 'FREE_' + Date.now(),
      paymentId: 'FREE_' + Date.now(),
      signature: 'FREE',
      amount: 0
    });

    res.json({ success: true, message: "Enrolled successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message || "Enrollment failed" });
  }
};

// Payment Success Page
export const getPaymentSuccess = async (req, res) => {
  try {
    const { orderId, paymentId, amount } = req.query;
    const userId = req.session.userId;

    console.log('=== PAYMENT SUCCESS PAGE ===');
    console.log('Query params:', { orderId, paymentId, amount });
    console.log('User ID from session:', userId);

    if (!userId) {
      console.log('ERROR: No userId in session, redirecting to login');
      return res.redirect('/user/login');
    }

    // Fetch user from database
    const user = await User.findById(userId);
    console.log('User found:', user ? user.fullName : 'NOT FOUND');

    if (!user) {
      console.log('ERROR: User not found in database');
      return res.redirect('/user/login');
    }

    // Fetch payment details and enrolled courses - FIXED: use 'course' not 'courseId'
    const payments = await Payment.find({ orderId }).populate('course');
    console.log('Payments found:', payments.length);
    
    const courses = payments.map(p => p.course).filter(c => c);
    console.log('Courses extracted:', courses.length);

    console.log('Attempting to render payment-success view...');
    
    res.render('user/payment-success', {
      user: user,
      currentPage: 'payment',
      orderId: orderId || 'N/A',
      paymentId: paymentId || 'N/A',
      amount: parseFloat(amount) || 0,
      courses: courses || []
    });

    console.log('View rendered successfully!');

  } catch (error) {
    console.error('=== PAYMENT SUCCESS PAGE ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('Redirecting to /user/courses due to error');
    res.redirect('/user/courses');
  }
};

// Payment Failure Page
export const getPaymentFailure = async (req, res) => {
  try {
    const { orderId, error } = req.query;
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/user/login');
    }

    // Fetch user from database
    const user = await User.findById(userId);

    // Get cart items to show what was attempted
    const cart = await cartService.getCart(userId);
    const courses = cart.items.map(item => item.course).filter(c => c);

    res.render('user/payment-failure', {
      user: user,
      currentPage: 'payment',
      orderId: orderId || null,
      errorMessage: error || 'The payment transaction was declined or cancelled.',
      courses,
      retryUrl: '/user/cart'
    });

  } catch (error) {
    console.error('Payment failure page error:', error);
    res.redirect('/user/cart');
  }
};

import razorpay from "../../config/razorpay.js";
import crypto from "crypto";
import Course from "../../models/Course.js";
import User from "../../models/User.js";
import { enrollUserInCourse } from "../../service/paymentService.js";
import * as cartService from "../../service/cartService.js";
import Payment from "../../models/Payment.js";
import Earning from '../../models/Earning.js';
import { generateInvoice } from '../../helpers/invoiceHelper.js';

export const createOrder = async (req, res) => {
  try {
    const { courseIds } = req.body; 
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

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

    let discount = 0;
    if (req.session.appliedCoupon) {
      const Coupon = (await import('../../models/coupon.js')).default;
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon.code.toUpperCase(), isActive: true });
      const userUsage = coupon ? coupon.usedBy.find(u => u.userId.toString() === userId.toString()) : null;
      const userUsedCount = userUsage ? userUsage.usedCount : 0;
      if (coupon && 
          (!coupon.startDate || new Date(coupon.startDate) <= new Date()) &&
          new Date(coupon.expiryDate) >= new Date() && 
          userUsedCount < coupon.usageLimit && 
          totalAmount >= coupon.minOrderValue) {
        
        if (coupon.discountType === 'percentage') {
          discount = Math.floor((totalAmount * coupon.discountValue) / 100);
        } else {
          discount = coupon.discountValue;
        }
        
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
        
        discount = Math.min(discount, totalAmount);
        totalAmount = Math.max(0, totalAmount - discount);
        
        req.session.appliedCoupon.discount = discount;
        req.session.appliedCoupon.finalTotal = totalAmount;
      } else {
        req.session.appliedCoupon = null;
      }
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
      courseIds 
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

    let originalTotal = 0;
    const courses = [];
    for (const courseId of courseIds) {
      const course = await Course.findById(courseId);
      if (course) {
        originalTotal += course.price;
        courses.push(course);
      }
    }

    let discount = 0;
    if (req.session.appliedCoupon) {
      const Coupon = (await import('../../models/coupon.js')).default;
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon.code.toUpperCase(), isActive: true });
      const userUsage = coupon ? coupon.usedBy.find(u => u.userId.toString() === userId.toString()) : null;
      const userUsedCount = userUsage ? userUsage.usedCount : 0;
      if (coupon && 
          (!coupon.startDate || new Date(coupon.startDate) <= new Date()) &&
          new Date(coupon.expiryDate) >= new Date() && 
          userUsedCount < coupon.usageLimit && 
          originalTotal >= coupon.minOrderValue) {
        
        if (coupon.discountType === 'percentage') {
          discount = Math.floor((originalTotal * coupon.discountValue) / 100);
        } else {
          discount = coupon.discountValue;
        }

        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }

        discount = Math.min(discount, originalTotal);

        const usageIndex = coupon.usedBy.findIndex(u => u.userId.toString() === userId.toString());
        if (usageIndex > -1) {
          coupon.usedBy[usageIndex].usedCount += 1;
        } else {
          coupon.usedBy.push({ userId, usedCount: 1 });
        }
        await coupon.save();
      }
    }

    let totalAmount = 0;
    let remainingDiscount = discount;
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      let courseDiscount = 0;
      if (discount > 0 && originalTotal > 0) {
        if (i === courses.length - 1) {
          courseDiscount = remainingDiscount;
        } else {
          courseDiscount = Math.round((course.price / originalTotal) * discount);
          remainingDiscount -= courseDiscount;
        }
      }
      const finalCoursePrice = Math.max(0, course.price - courseDiscount);
      totalAmount += finalCoursePrice;

      await enrollUserInCourse(userId, course._id, {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: finalCoursePrice
      });
    }

    req.session.appliedCoupon = null;

    console.log('User enrolled in courses, total amount:', totalAmount);

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

    const user = await User.findById(userId);
    console.log('User found:', user ? user.fullName : 'NOT FOUND');

    if (!user) {
      console.log('ERROR: User not found in database');
      return res.redirect('/user/login');
    }

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

export const getPaymentFailure = async (req, res) => {
  try {
    const { orderId, error,courseIds } = req.query;
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/user/login');
    }

    const user = await User.findById(userId);
      
     let courses = [];
    if (courseIds) {
      const ids = courseIds.split(',');
      courses = await Course.find({ _id: { $in: ids } });
    } else {
      const cart = await cartService.getCart(userId);
      courses = cart.items.map(item => item.course).filter(c => c);
    }
  
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
    res.redirect('/user/payment/failure');

  }
};


export const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId;

    console.log('OrderId:', orderId);
    console.log('UserId:', userId);

    if (!userId) {
      console.log('No user session');
      return res.redirect('/user/login');
    }

    const payments = await Payment.find({ orderId, user: userId })
      .populate({
        path: 'course',
        populate: {
          path: 'tutor',
          select: 'fullName'
        }
      })
      .populate('user');

    console.log('Payments found:', payments.length);

    if (!payments || payments.length === 0) {
      console.log('No payments found');
      return res.status(404).send('Invoice not found');
    }

    const user = payments[0].user;
    const courses = payments.map(p => p.course).filter(c => c);

    console.log('User:', user ? user.fullName : 'NULL');
    console.log('Courses:', courses.length);

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (courses.length === 0) {
      return res.status(404).send('No courses found');
    }

    console.log('Generating invoice PDF...');
    const filepath = await generateInvoice(payments, user);
    console.log('PDF generated at:', filepath);

    res.download(filepath, 'invoice-' + orderId + '.pdf', (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error downloading invoice');
        }
      } else {
        console.log('Invoice sent successfully');
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).send('Failed to generate invoice: ' + error.message);
    }
  }
};

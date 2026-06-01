import Cart from '../models/Cart.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

export const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.course',
      select: 'title price thumbnail category tutor isPublished',
      populate: {
        path: 'tutor',
        select: 'fullName'
      }
    });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  cart.items = cart.items.filter(item => item.course && item.course.isPublished);
  
  return cart;
};

export const addToCart = async (userId, courseId) => {
  const user = await User.findById(userId);
  const alreadyEnrolled = user.enrolledCourses.some(id => id.toString() === courseId);
  
  if (alreadyEnrolled) {
    throw new Error('You are already enrolled in this course');
  }

  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  if (!course.isPublished) {
    throw new Error('Course is not available');
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  const alreadyInCart = cart.items.some(item => item.course.toString() === courseId);
  if (alreadyInCart) {
    throw new Error('Course already in cart');
  }

  cart.items.push({ course: courseId });
  await cart.save();

  return cart;
};

export const removeFromCart = async (userId, courseId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new Error('Cart not found');
  }

  cart.items = cart.items.filter(item => item.course && item.course.toString() !== courseId);
  await cart.save();

  return cart;
};

export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return cart;
};

export const getCartTotal = (cart) => {
  return cart.items.reduce((total, item) => {
    return total + (item.course?.price || 0);
  }, 0);
};

export const getCartCount = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  return cart ? cart.items.length : 0;
};

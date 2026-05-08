import * as cartService from '../../service/cartService.js';
import User from '../../models/User.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select('fullName email avatar');
    
    const cart = await cartService.getCart(userId);
    const total = cartService.getCartTotal(cart);

    res.render('user/cart', {
      cart,
      total,
      user,
      currentPage: 'cart'
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.redirect('/user/courses');
  }
};

export const addToCart = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.session.userId;

    await cartService.addToCart(userId, courseId);

    res.json({ success: true, message: 'Course added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.session.userId;

    await cartService.removeFromCart(userId, courseId);

    res.json({ success: true, message: 'Course removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCartCount = async (req, res) => {
  try {
    const userId = req.session.userId;
    const count = await cartService.getCartCount(userId);
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.json({ success: false, count: 0 });
  }
};

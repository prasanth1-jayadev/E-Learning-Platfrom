import * as cartService from '../../service/cartService.js';
import User from '../../models/User.js';
import Coupon from '../../models/coupon.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select('fullName email avatar');
    
    const cart = await cartService.getCart(userId);
    const total = cartService.getCartTotal(cart);

    // Validate and recalculate applied coupon dynamically
    if (req.session.appliedCoupon) {
      const coupon = await Coupon.findOne({ code: req.session.appliedCoupon.code.toUpperCase(), isActive: true });
      const userUsage = coupon ? coupon.usedBy.find(u => u.userId.toString() === userId.toString()) : null;
      const userUsedCount = userUsage ? userUsage.usedCount : 0;
      if (coupon && 
          (!coupon.startDate || new Date(coupon.startDate) <= new Date()) &&
          new Date(coupon.expiryDate) >= new Date() && 
          userUsedCount < coupon.usageLimit && 
          total >= coupon.minOrderValue) {
        
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = Math.floor((total * coupon.discountValue) / 100);
        } else {
          discount = coupon.discountValue;
        }

        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }

        discount = Math.min(discount, total); // Ensure total discount doesn't exceed cart total

        req.session.appliedCoupon.discount = discount;
        req.session.appliedCoupon.finalTotal = total - discount;
      } else {
        req.session.appliedCoupon = null;
      }
    }

    const appliedCoupon = req.session.appliedCoupon || null;

    // Fetch active available coupons
    const rawCoupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: new Date() }
    });
    const coupons = rawCoupons.filter(c => {
      const userUsage = c.usedBy.find(u => u.userId.toString() === userId.toString());
      const userUsedCount = userUsage ? userUsage.usedCount : 0;
      return userUsedCount < c.usageLimit;
    });

    res.render('user/cart', {
      cart,
      total,
      user,
      currentPage: 'cart',
      appliedCoupon,
      coupons
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

export const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.session.userId;

    const cart = await cartService.getCart(userId);
    const total = cartService.getCartTotal(cart);

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive coupon code' });
    }

    if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has not started yet' });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    const userUsage = coupon.usedBy.find(u => u.userId.toString() === userId.toString());
    const userUsedCount = userUsage ? userUsage.usedCount : 0;
    if (userUsedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'You have already reached the usage limit for this coupon' });
    }

    if (total < coupon.minOrderValue) {
      return res.status(400).json({ success: false, message: `Minimum order value is ₹${coupon.minOrderValue}` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.floor((total * coupon.discountValue) / 100);
    } else {
      discount = coupon.discountValue;
    }

    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }

    discount = Math.min(discount, total); 

    const finalTotal = total - discount;

    // Store in session
    req.session.appliedCoupon = {
      code: coupon.code,
      couponId: coupon._id,
      discount,
      finalTotal
    };

    res.json({
      success: true,
      message: `Coupon applied! You save ₹${discount}`,
      discount,
      finalTotal
    });

  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply coupon' });
  }
};

export const removeCoupon = async (req, res) => {
  try {
    req.session.appliedCoupon = null;
    res.json({ success: true, message: 'Coupon removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove coupon' });
  }
};

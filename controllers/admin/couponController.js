import Coupon from '../../models/coupon.js';

export const getCouponsPage = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.render('admin/coupons', {
            coupons,
            currentPage: 'coupons'
        });
    } catch (err) {
        console.error('Get coupons error:', err);
        res.status(500).send('Server error');
    }
};

export const createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderValue, maxDiscount, startDate, expiryDate, usageLimit } = req.body;

        if (!code || !discountType || !discountValue || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (startDate && expiryDate && new Date(startDate) > new Date(expiryDate)) {
            return res.status(400).json({ success: false, message: 'Start date cannot be after expiry date' });
        }

        if (discountType === 'flat' && Number(minOrderValue || 0) <= Number(discountValue)) {
            return res.status(400).json({ success: false, message: 'Minimum order value must be higher than the discount value for flat coupons' });
        }

        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minOrderValue: Number(minOrderValue) || 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            startDate: startDate ? new Date(startDate) : undefined,
            expiryDate,
            usageLimit: Number(usageLimit) || 1
        });

        res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
    } catch (err) {
        console.error('Create coupon error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({ success: true, isActive: coupon.isActive });
    } catch (err) {
        console.error('Toggle coupon error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

        res.json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error('Delete coupon error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

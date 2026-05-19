import User from '../../models/User.js';
import Course from '../../models/Course.js';

const getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.session.userId)
            .populate({
                path: 'wishlist',
                populate: {
                    path: 'tutor',
                    select: 'fullName'
                }
            });

        if (!user) {
            return res.redirect('/user/login');
        }

        res.render('user/wishlist', {
            user,
            wishlistCourses: user.wishlist || []
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.render('user/wishlist', {
            user: { fullName: 'User' },
            wishlistCourses: []
        });
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if already in
        if (user.wishlist.includes(courseId)) {
            return res.json({ success: false, message: 'Course already in wishlist' });
        }

        // Check if already enrolled
        if (user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: 'You are already enrolled in this course' });
        }

        user.wishlist.push(courseId);
        await user.save();

        res.json({ success: true, message: 'Added to wishlist' });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.wishlist = user.wishlist.filter(id => id.toString() !== courseId);
        await user.save();

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
    }
};

const checkWishlist = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ inWishlist: false });
        }

        const inWishlist = user.wishlist.includes(courseId);
        res.json({ inWishlist });
    } catch (error) {
        console.error('Check wishlist error:', error);
        res.json({ inWishlist: false });
    }
};

export { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };

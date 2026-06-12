import * as categoryService from '../../service/categoryService.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import Cart from '../../models/Cart.js';
import Review from '../../models/Review.js';


const getCourses = async (req, res) => {
  try {
    const user = req.session.userId ? await User.findById(req.session.userId) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';

    let categories = [];
    try {
      categories = await categoryService.getListedCategories();
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = [];
    }

    const filter = {
      isPublished: true,
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    let sortQuery = {};
    switch (sort) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'price-low':
        sortQuery = { price: 1 };
        break;
      case 'price-high':
        sortQuery = { price: -1 };
        break;
      case 'title-az':
        sortQuery = { title: 1 };
        break;
      case 'title-za':
        sortQuery = { title: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const totalCourses = await Course.countDocuments(filter);
    const courses = await Course.find(filter)
      .populate('tutor', 'fullName avatar bio')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCourses / limit);

    res.render('user/courses', {
      courses,
      categories,
      page: page,
      totalPages,
      totalCourses,
      search,
      category,
      sort,
      user,
      currentPage: 'courses'
    });

  } catch (error) {
    console.error(error);
    res.render('user/courses', {
      courses: [],
      categories: [],
      page: 1,
      totalPages: 1,
      totalCourses: 0,
      search: '',
      category: '',
      sort: 'newest',
      user: null,
      currentPage: 'courses'
    });
  }
};


const getCourseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const user = userId
      ? await User.findById(userId).select('enrolledCourses fullName email avatar')
      : null;

    const course = await Course.findById(id)
      .populate('tutor', 'fullName email bio avatar subjects');

    if (!course) {
      return res.redirect('/user/courses');
    }

    let isPurchased = false;
    let isInCart = false;
    let hasReviewed = false;

    if (user) {
      isPurchased = user.enrolledCourses?.some(
        courseId => courseId.toString() === id
      );

      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        isInCart = cart.items.some(item => item.course.toString() === id);
      }

      // Check if user has already left a review
      const existingReview = await Review.findOne({ course: id, user: userId });
      hasReviewed = !!existingReview;
    }

    // Fetch all reviews for this course, populating the reviewer's details
    const reviews = await Review.find({ course: id })
      .populate('user', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.render('user/course-detail', {
      course,
      user,
      isPurchased,
      isInCart,
      hasReviewed,
      reviews,
      currentPage: "courses"
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    res.redirect('/user/courses');
  }
};


const addReview = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.session.userId;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    // 1. Validation
    const parsedRating = parseInt(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    }

    // 2. Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // 3. Verify enrollment (User must have bought the course to review it)
    const user = await User.findById(userId);
    const isEnrolled = user.enrolledCourses?.some(
      cId => cId.toString() === courseId
    );
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: "You can only review courses you have purchased" });
    }

    // 4. Prevent duplicate reviews
    const existingReview = await Review.findOne({ course: courseId, user: userId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this course" });
    }

    // 5. Save the new review
    const review = new Review({
      user: userId,
      course: courseId,
      rating: parsedRating,
      comment: comment.trim()
    });
    await review.save();

    // 6. Recalculate average rating & review count for the course
    const reviews = await Review.find({ course: courseId });
    const reviewCount = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

    course.rating = parseFloat(averageRating.toFixed(1));
    course.reviewCount = reviewCount;
    await course.save();

    res.json({
      success: true,
      message: "Your review has been posted successfully!",
      rating: course.rating,
      reviewCount: course.reviewCount
    });

  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: "Failed to submit review. Please try again." });
  }
};


// Keep the blockuser function so userRouter.js doesn't crash:
const blockuser = async (req, res) => {
  const reqblock = await User.find({ role: "user" });
  res.json(reqblock);
};

// Export all the functions:
export {
  getCourses,
  getCourseDetail,
  addReview,
  blockuser
};

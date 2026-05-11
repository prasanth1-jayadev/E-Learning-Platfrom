import * as categoryService from '../../service/categoryService.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import Cart from '../../models/Cart.js';

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
    
    if (user) {
      isPurchased = user.enrolledCourses?.some(
        courseId => courseId.toString() === id  
      );
      
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        isInCart = cart.items.some(item => item.course.toString() === id);
      }
    }

    res.render('user/course-detail', {
      course,
      user,
      isPurchased,
      isInCart,
      currentPage: "courses"
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    res.redirect('/user/courses');
  }
};



export {
  getCourses,
  getCourseDetail
};

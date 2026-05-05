import * as categoryService from '../../service/categoryService.js';
import Course from '../../models/Course.js';

// Get Courses List
const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';

    // Get categories
    let categories = [];
    try {
      categories = await categoryService.getListedCategories();
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = [];
    }

    // Build filter query
    const filter = {
      isPublished: true,
      // Exclude the specific psychology course
      $nor: [
        { title: 'psychology', category: 'SCIENCE' }
      ]
    };

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Build sort query
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
      currentPage: page,
      totalPages,
      totalCourses,
      search,
      category,
      sort
    });

  } catch (error) {
    console.error(error);
    res.render('user/courses', {
      courses: [],
      categories: [],
      currentPage: 1,
      totalPages: 1,
      totalCourses: 0,
      search: '',
      category: '',
      sort: 'newest'
    });
  }
};

// Get Course Detail
const getCourseDetail = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).populate('tutor', 'fullName bio avatar');

    if (!course) {
      return res.redirect('/user/courses');
    }

    res.render('user/course-detail', { course });

  } catch (error) {
    console.error(error);
    res.redirect('/user/courses');
  }
};

export {
  getCourses,
  getCourseDetail
};

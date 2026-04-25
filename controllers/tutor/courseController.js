import * as courseService from '../../service/courseService.js';
import * as categoryService from '../../service/categoryService.js';
import Tutor from '../../models/Tutor.js';

const getCourses = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const tutor = await Tutor.findById(tutorId);

    if (!tutor) {
      return res.redirect('/tutor/login');
    }

    const filters = {
      status: req.query.status,
      category: req.query.category
    };

    // Get listed categories for filtering
    let categories = [];
    try {
      categories = await categoryService.getListedCategories();
      console.log('Categories fetched for courses list:', categories.length);
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = []; 
    }

    const courses = await courseService.getTutorCourses(tutorId, filters);

    res.render('tutor/courses', {
      tutor,
      courses,
      categories,
      currentPage: 'courses'
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).render('error', { message: 'Failed to load courses' });
  }
};


const getCreateCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const tutor = await Tutor.findById(tutorId);

    if (!tutor) {
      return res.redirect('/tutor/login');
    }

    if (tutor.approvalStatus !== 'approved') {
      return res.status(403).render('error', { 
        message: 'Only approved tutors can create courses' 
      });
    }

    let categories = [];
    try {
      categories = await categoryService.getListedCategories();
      console.log('Categories fetched for create course:', categories.length);
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = []; 
    }
    res.render('tutor/create-course', {
      tutor,
      categories,
      currentPage: 'courses'
    });
  } catch (error) {
    console.error('Get create course error:', error);
    res.status(500).render('error', { message: 'Failed to load create course page' });
  }
};

// Create new course
const postCreateCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    
    
    if (!tutorId) {
      return res.status(401).json({ 
        success: false,
        message: 'Please login to continue' 
      });
    }




    const { title, description, category, level, price, discountPrice } = req.body;

    console.log('Create course request:', { 
      title, 
      category, 
      price, 
      hasFile: !!req.file,
      fileDetails: req.file ? { path: req.file.path, mimetype: req.file.mimetype } : null
    });

    // Basic validation
    if (!title || !description || !category) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, description, and category are required' 
      });
    }

    if (title.trim().length < 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Title must be at least 5 characters long' 
      });
    }

    if (description.trim().length < 20) {
      return res.status(400).json({ 
        success: false,
        message: 'Description must be at least 20 characters long' 
      });
    }




    const courseData = {
      title: title.trim(),
      description: description.trim(),
      category,
      level: level || 'Beginner',
      price: parseFloat(price) || 0,
      discountPrice: discountPrice ? parseFloat(discountPrice) : null
    };

    if (req.file) {
      courseData.thumbnail = req.file.path;
      console.log('Thumbnail uploaded successfully:', req.file.path);
    }

    if (courseData.discountPrice && courseData.discountPrice >= courseData.price) {
      return res.status(400).json({ 
        success: false,
        message: 'Discount price must be less than regular price' 
      });
    }

    const course = await courseService.createCourse(courseData, tutorId);

    console.log('Course created successfully:', course._id);

    res.status(200).json({ 
      success: true, 
      message: 'Course created successfully',
      courseId: course._id
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to create course'
    });
  }
};




const getEditCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;
    
    console.log('=== EDIT COURSE START ===');
    console.log('Tutor ID:', tutorId);
    console.log('Course ID:', courseId);
    
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      console.log('Tutor not found, redirecting to login');
      return res.redirect('/tutor/login');
    }
    console.log('Tutor found:', tutor.fullName);

    
    let categories = [];
    console.log('Fetching categories...');
    
    try {
      const fetchedCategories = await categoryService.getListedCategories();
      console.log('Raw categories from service:', fetchedCategories);
      
      if (fetchedCategories && Array.isArray(fetchedCategories)) {
        categories = fetchedCategories;
        console.log('✅ Categories successfully fetched:', categories.length);
        console.log('Category names:', categories.map(c => c.name));
      } else {
        console.log('⚠️ Categories is not an array:', typeof fetchedCategories);
        categories = [];
      }
    } catch (categoryError) {
      console.error(' Error fetching categories:', categoryError);
      categories = []; 
    }

    console.log('Fetching course...');
    const course = await courseService.getCourseById(courseId, tutorId);
    console.log('Course found:', course.title);
    console.log('Course category:', course.category);
    
    console.log('=== RENDERING TEMPLATE ===');
    console.log('Categories to pass:', categories.length);
    console.log('Categories array:', JSON.stringify(categories.map(c => ({ name: c.name }))));

    res.render('tutor/edit-course', {
      tutor: tutor,
      course: course,
      categories: categories,
      currentPage: 'courses'
    });
    
    console.log('=== EDIT COURSE END ===');
  } catch (error) {
    console.error(' Get edit course error:', error);
    res.status(404).render('error', { message: 'Course not found' });
  }
};




// Update course
const postUpdateCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;
    const { title, description, category, level, price, discountPrice } = req.body;

    console.log('Update course request:', { courseId, title, category, hasFile: !!req.file });

    
    if (!title || !description || !category) {
      return res.status(400).json({ 
        message: 'Title, description, and category are required' 
      });
    }

    const updateData = {
      title: title.trim(),
      description: description.trim(),
      category,
      level,
      price: parseFloat(price) || 0,
      discountPrice: discountPrice ? parseFloat(discountPrice) : null
    };


    if (req.file) {
      updateData.thumbnail = req.file.path;
      console.log('New thumbnail uploaded:', req.file.path);
    }

  
    if (updateData.discountPrice && updateData.discountPrice >= updateData.price) {
      return res.status(400).json({ 
        message: 'Discount price must be less than regular price' 
      });
    }

    await courseService.updateCourse(courseId, tutorId, updateData);

    res.json({ 
      success: true, 
      message: 'Course updated successfully' 
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to update course'
    });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;

    await courseService.deleteCourse(courseId, tutorId);

    res.json({ 
      success: true, 
      message: 'Course deleted successfully' 
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(400).json({ message: error.message });
  }
};


const togglePublish = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;

    const course = await courseService.togglePublishCourse(courseId, tutorId);

    res.json({ 
      success: true, 
      message: course.isPublished ? 'Course published successfully' : 'Course unpublished',
      isPublished: course.isPublished
    });
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(400).json({ message: error.message });
  }
};


const getCourseDetails = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;

    const course = await courseService.getCourseById(courseId, tutorId);

    res.json({ success: true, course });
  } catch (error) {
    console.error('Get course details error:', error);
    res.status(404).json({ message: error.message });
  }
};

export {
  getCourses,
  getCreateCourse,
  postCreateCourse,
  getEditCourse,
  postUpdateCourse,
  deleteCourse,
  togglePublish,
  getCourseDetails
};

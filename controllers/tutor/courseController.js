import * as courseService from '../../service/courseService.js';
import Tutor from '../../models/Tutor.js';

// Get all courses for logged-in tutor
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

    const courses = await courseService.getTutorCourses(tutorId, filters);

    res.render('tutor/courses', {
      tutor,
      courses,
      currentPage: 'courses'
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).render('error', { message: 'Failed to load courses' });
  }
};

// Show create course form
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

    res.render('tutor/create-course', {
      tutor,
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
    
    // Check if tutor is logged in
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

    // Add thumbnail if uploaded
    if (req.file) {
      courseData.thumbnail = req.file.path;
      console.log('Thumbnail uploaded successfully:', req.file.path);
    }

    // Validate discount price
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

// Show edit course form
const getEditCourse = async (req, res) => {
  try {
    const tutorId = req.session.tutorId;
    const courseId = req.params.id;
    
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.redirect('/tutor/login');
    }

    const course = await courseService.getCourseById(courseId, tutorId);

    res.render('tutor/edit-course', {
      tutor,
      course,
      currentPage: 'courses'
    });
  } catch (error) {
    console.error('Get edit course error:', error);
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

    // Basic validation
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

    // Add thumbnail if uploaded
    if (req.file) {
      updateData.thumbnail = req.file.path;
      console.log('New thumbnail uploaded:', req.file.path);
    }

    // Validate discount price
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

// Delete course
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

// Toggle publish status
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

// Get course details (API endpoint)
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

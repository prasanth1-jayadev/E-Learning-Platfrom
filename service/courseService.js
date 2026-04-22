import Course from '../models/Course.js';
import Tutor from '../models/Tutor.js';

// Get all courses for a specific tutor
const getTutorCourses = async (tutorId, filters = {}) => {
  try {
    const query = { tutor: tutorId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return courses;
  } catch (error) {
    throw new Error('Failed to fetch courses: ' + error.message);
  }
};

// Get single course by ID
const getCourseById = async (courseId, tutorId = null) => {
  try {
    const query = { _id: courseId };
    
    if (tutorId) {
      query.tutor = tutorId;
    }

    const course = await Course.findOne(query)
      .populate('tutor', 'fullName email')
      .lean();

    if (!course) {
      throw new Error('Course not found');
    }

    return course;
  } catch (error) {
    throw new Error('Failed to fetch course: ' + error.message);
  }
};

// Create new course
const createCourse = async (courseData, tutorId) => {
  try {
    // Verify tutor exists and is approved
    const tutor = await Tutor.findById(tutorId);
    
    if (!tutor) {
      throw new Error('Tutor not found');
    }

    if (tutor.approvalStatus !== 'approved') {
      throw new Error('Only approved tutors can create courses');
    }

    const course = new Course({
      ...courseData,
      tutor: tutorId,
      status: 'draft',
      isPublished: false
    });

    await course.save();
    return course;
  } catch (error) {
    throw new Error('Failed to create course: ' + error.message);
  }
};

// Update course
const updateCourse = async (courseId, tutorId, updateData) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'tutor') {
        course[key] = updateData[key];
      }
    });

    await course.save();
    return course;
  } catch (error) {
    throw new Error('Failed to update course: ' + error.message);
  }
};

// Delete course
const deleteCourse = async (courseId, tutorId) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Check if course has enrolled students
    if (course.enrolledStudents.length > 0) {
      throw new Error('Cannot delete course with enrolled students. Archive it instead.');
    }

    await Course.deleteOne({ _id: courseId });
    return { message: 'Course deleted successfully' };
  } catch (error) {
    throw new Error('Failed to delete course: ' + error.message);
  }
};

// Publish/Unpublish course
const togglePublishCourse = async (courseId, tutorId) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Validate course has minimum requirements before publishing
    if (!course.isPublished) {
      if (!course.title || !course.description || !course.category) {
        throw new Error('Course must have title, description, and category before publishing');
      }
    }

    course.isPublished = !course.isPublished;
    course.status = course.isPublished ? 'published' : 'draft';
    
    await course.save();
    return course;
  } catch (error) {
    throw new Error('Failed to toggle publish status: ' + error.message);
  }
};

// Get dashboard statistics
const getDashboardStats = async (tutorId) => {
  try {
    const courses = await Course.find({ tutor: tutorId });
    
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.isPublished).length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;
    
    let totalStudents = 0;
    let totalRevenue = 0;
    
    courses.forEach(course => {
      totalStudents += course.enrolledStudents.length;
      totalRevenue += course.enrolledStudents.length * course.price;
    });

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalStudents,
      totalRevenue
    };
  } catch (error) {
    throw new Error('Failed to fetch dashboard stats: ' + error.message);
  }
};

// Get all published courses (for users)
const getPublishedCourses = async (filters = {}) => {
  try {
    const query = { isPublished: true, status: 'published' };
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.level) {
      query.level = filters.level;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('tutor', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    return courses;
  } catch (error) {
    throw new Error('Failed to fetch published courses: ' + error.message);
  }
};

export {
  getTutorCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublishCourse,
  getDashboardStats,
  getPublishedCourses
};

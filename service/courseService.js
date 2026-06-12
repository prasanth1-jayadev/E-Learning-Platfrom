import Course from '../models/Course.js';
import Tutor from '../models/Tutor.js';

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


const createCourse = async (courseData, tutorId) => {
  try {
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

const updateCourse = async (courseId, tutorId, updateData) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }


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


const deleteCourse = async (courseId, tutorId) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    if (course.enrolledStudents.length > 0) {
      throw new Error('Cannot delete course with enrolled students. Archive it instead.');
    }

    await Course.deleteOne({ _id: courseId });
    return { message: 'Course deleted successfully' };
  } catch (error) {
    throw new Error('Failed to delete course: ' + error.message);
  }
};


const togglePublishCourse = async (courseId, tutorId) => {
  try {
    const course = await Course.findOne({ _id: courseId, tutor: tutorId });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

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

const getTutorAnalytics = async (tutorId) => {
  try {
    const Payment = (await import('../models/Payment.js')).default;
    
    // Get all coursesthis tutor
    const courses = await Course.find({ tutor: tutorId }).lean();
    
    const courseIds = courses.map(c => c._id);
    const payments = await Payment.find({ 
      course: { $in: courseIds },
      status: 'completed'
    }).populate('course').lean();

    const monthlyData = {};
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      monthlyData[monthKey] = { revenue: 0, profit: 0 };
    }

    payments.forEach(payment => {
      const paymentDate = new Date(payment.createdAt);
      const monthKey = paymentDate.toLocaleString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        const revenue = payment.amount;
        const profit = revenue * 0.8; // 80% to tutor
        
        monthlyData[monthKey].revenue += revenue;
        monthlyData[monthKey].profit += profit;
      }
    });

    const revenueData = {
      labels: Object.keys(monthlyData),
      revenue: Object.values(monthlyData).map(d => Math.round(d.revenue)),
      profit: Object.values(monthlyData).map(d => Math.round(d.profit))
    };

    let excellent = 0, good = 0, average = 0;
    
    courses.forEach(course => {
      const enrollmentCount = course.enrolledStudents.length;
      if (enrollmentCount >= 50) excellent++;
      else if (enrollmentCount >= 20) good++;
      else average++;
    });

    const coursePerformance = {
      excellent,
      good,
      average
    };

    const totalViews = courses.reduce((sum, course) => sum + (course.views || 0), 0);
    const totalEnrollments = courses.reduce((sum, course) => sum + course.enrolledStudents.length, 0);
    const totalCompletions = Math.round(totalEnrollments * 0.65); // Estimate 65% completion rate

    const keyMetrics = {
      totalViews,
      totalEnrollments,
      totalCompletions
    };

    return {
      revenueData,
      coursePerformance,
      keyMetrics
    };
  } catch (error) {
    throw new Error('Failed to fetch tutor analytics: ' + error.message);
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
  getPublishedCourses,
  getTutorAnalytics
};

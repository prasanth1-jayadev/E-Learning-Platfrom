import Course from '../../models/Course.js';
import Tutor from '../../models/Tutor.js';
import * as adminService from '../../service/adminService.js';

/**
 * Get all courses with pagination, search, and filters
 */
const getCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const category = req.query.category || 'all';

        // Build query
        let query = {};

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (status !== 'all') {
            query.status = status;
        }

        if (category !== 'all') {
            query.category = category;
        }

        // Get total count
        const totalCourses = await Course.countDocuments(query);

        // Get courses with tutor details
        const courses = await Course.find(query)
            .populate('tutor', 'fullName email profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalCourses / limit);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        // Get unique categories for filter
        const categories = await Course.distinct('category');

        res.render('admin/courses', {
            courses,
            search,
            status,
            category,
            categories,
            currentPage: 'courses',
            pendingCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalCourses,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });

    } catch (error) {
        console.error('Error fetching courses:', error);
        res.render('admin/courses', {
            courses: [],
            search: '',
            status: 'all',
            category: 'all',
            categories: [],
            currentPage: 'courses',
            pendingCount: 0,
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalCourses: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
};

/**
 * Get course detail with lessons
 */
const getCourseDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id)
            .populate('tutor', 'fullName email profilePicture bio')
            .populate('enrolledStudents', 'fullName email');

        if (!course) {
            return res.redirect('/admin/courses?error=' + encodeURIComponent('Course not found'));
        }

        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render('admin/course-detail', {
            course,
            currentPage: 'courses',
            pendingCount
        });

    } catch (error) {
        console.error('Error fetching course detail:', error);
        res.redirect('/admin/courses?error=' + encodeURIComponent('Failed to fetch course details'));
    }
};

/**
 * Toggle course status (draft/published/archived)
 */
const toggleCourseStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        course.status = status;
        course.isPublished = status === 'published';
        await course.save();

        res.json({ 
            success: true, 
            message: `Course ${status} successfully`,
            status: course.status
        });

    } catch (error) {
        console.error('Toggle course status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course status' });
    }
};

/**
 * Delete course
 */
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if course has enrolled students
        if (course.enrolledStudents && course.enrolledStudents.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete course with ${course.enrolledStudents.length} enrolled students. Archive it instead.` 
            });
        }

        await Course.findByIdAndDelete(id);

        res.json({ success: true, message: 'Course deleted successfully' });

    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete course' });
    }
};

export { getCourses, getCourseDetail, toggleCourseStatus, deleteCourse };

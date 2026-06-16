/**
 * controllers/tutor/lessonController.js
 * Handles lesson CRUD and the tutor orders page.
 * All DB operations go through tutorService / courseService.
 */
import * as tutorService  from '../../service/tutorService.js';
import { uploadToCloudinary } from '../../config/cloudinary.js';
import { sendNotification }   from '../../service/notificationService.js';
import Course from '../../models/Course.js';

// ---------------------------------------------------------------------------
// Lesson management
// ---------------------------------------------------------------------------

const getAddLessonPage = async (req, res) => {
    try {
        const tutor  = await tutorService.getTutorById(req.session.tutorId);
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.redirect('/tutor/courses');
        }

        res.render('tutor/add-lesson', { tutor, course });
    } catch (error) {
        console.error('Error loading add lesson page:', error);
        res.redirect('/tutor/courses');
    }
};

const addLesson = async (req, res) => {
    try {
        const { title, description, duration } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Lesson title is required' });
        }
        if (title.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Lesson title must be at least 3 characters long' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, message: 'Lesson description is required' });
        }
        if (description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Lesson description must be at least 10 characters long' });
        }
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let videoUrl      = '';
        let videoDuration = duration || 0;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'course-videos', 'video');
            videoUrl = result.secure_url;
            if (result.duration) videoDuration = Math.round(result.duration);
        }

        course.lessons.push({
            title,
            description,
            duration: videoDuration,
            videoUrl,
            order: course.lessons.length + 1
        });
        await course.save();

        // Notify enrolled students
        if (course.enrolledStudents && course.enrolledStudents.length > 0) {
            const tutor = await tutorService.getTutorById(req.session.tutorId);
            for (const studentId of course.enrolledStudents) {
                await sendNotification({
                    recipientId:   studentId,
                    recipientType: 'user',
                    title:         'New Lesson Uploaded',
                    message:       `Tutor "${tutor.fullName}" added a new lesson "${title}" in course: "${course.title}"`,
                    type:          'new_lesson',
                    relatedId:     course._id
                });
            }
        }

        res.json({ success: true, message: 'Lesson added successfully' });
    } catch (error) {
        console.error('Error adding lesson:', error);
        res.status(500).json({ message: 'Failed to add lesson' });
    }
};

const getEditLessonPage = async (req, res) => {
    try {
        const tutor  = await tutorService.getTutorById(req.session.tutorId);
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.redirect('/tutor/courses');
        }

        const lesson = course.lessons.id(req.params.lessonId);
        if (!lesson) {
            return res.redirect(`/tutor/course/${req.params.id}/add-lesson`);
        }

        res.render('tutor/edit-lesson', { tutor, course, lesson });
    } catch (error) {
        console.error('Error loading edit lesson page:', error);
        res.redirect('/tutor/courses');
    }
};

const updateLesson = async (req, res) => {
    try {
        const { title, description, duration } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Lesson title is required' });
        }
        if (title.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Lesson title must be at least 3 characters long' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, message: 'Lesson description is required' });
        }
        if (description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Lesson description must be at least 10 characters long' });
        }
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const lesson = course.lessons.id(req.params.lessonId);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        lesson.title       = title;
        lesson.description = description;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'course-videos', 'video');
            lesson.videoUrl = result.secure_url;
            if (result.duration) lesson.duration = Math.round(result.duration);
        } else {
            lesson.duration = duration;
        }

        await course.save();
        res.json({ success: true, message: 'Lesson updated successfully' });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({ message: 'Failed to update lesson' });
    }
};

const deleteLesson = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course || course.tutor.toString() !== req.session.tutorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        course.lessons.pull(req.params.lessonId);
        await course.save();

        res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({ message: 'Failed to delete lesson' });
    }
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const data = await tutorService.getTutorOrders(req.session.tutorId, page, 6);

        res.render('tutor/orders', {
            tutor:           data.tutor,
            currentPage:     'orders',
            orders:          data.orders,
            totalRevenue:    data.totalRevenue,
            totalSales:      data.totalSales,
            activeMonthSales: data.activeMonthSales,
            page:            data.page,
            totalPages:      data.totalPages
        });
    } catch (error) {
        console.error('Error fetching tutor orders:', error);
        res.redirect('/tutor/dashboard');
    }
};

export {
    getAddLessonPage,
    addLesson,
    getEditLessonPage,
    updateLesson,
    deleteLesson,
    getOrders,
};

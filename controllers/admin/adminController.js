import * as adminService from '../../service/adminService.js';
import User from '../../models/User.js';

const getLogin = (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    res.render('admin/login');
};

const getDashboard = async (req, res) => {
    try {
        const pendingTutors = await adminService.getPendingTutorApplications();
        const allTutors = await adminService.getTutorApplications();

        res.render('admin/dashboard', {
            pendingTutors,
            allTutors,
            pendingCount: pendingTutors.length,
            totalTutors: allTutors.length,
            currentPage: 'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            pendingTutors: [],
            allTutors: [],
            pendingCount: 0,
            totalTutors: 0,
            currentPage: 'dashboard'
        });
    }
};

const getTutorApplications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const success = req.query.success;
        const error = req.query.error;

        const result = await adminService.getTutorApplications(page, 10, search);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render('admin/tutor-applications', {
            tutors: result.tutors,
            search,
            success,
            error,
            currentPage: 'tutor-applications',
            pendingCount,
            pagination: {
                currentPage: result.page,
                totalPages: result.pages,
                totalApplications: result.total,
                hasNext: result.hasNext,
                hasPrev: result.hasPrev,
                nextPage: result.page + 1,
                prevPage: result.page - 1
            }
        });
    } catch (error) {
        console.error('Error fetching tutor applications:', error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

const getTutors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const blocked = req.query.blocked || 'all';

        const result = await adminService.getTutors(page, 5, search, blocked);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render('admin/tutors', {
            ...result,
            search,
            blocked,
            currentPage: 'tutors',
            pendingCount
        });
    } catch (error) {
        console.error('Error fetching tutors:', error);
        res.status(500).json({ message: 'Failed to fetch tutors' });
    }
};

const approveTutor = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const adminId = req.session.adminId;

        await adminService.approveTutor(tutorId, adminId);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: true, message: 'Tutor approved successfully', redirect: '/admin/tutor-applications' });
        }

        res.redirect('/admin/tutor-applications?success=approved');
    } catch (error) {
        console.error('Approve tutor error:', error);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ message: error.message });
        }

        res.redirect('/admin/tutor-applications?error=' + encodeURIComponent(error.message));
    }
};

const rejectTutor = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const adminId = req.session.adminId;

        await adminService.rejectTutor(tutorId, adminId);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: true, message: 'Tutor rejected successfully' });
        }

        res.redirect('/admin/tutor-applications?success=rejected');
    } catch (error) {
        console.error('Reject tutor error:', error);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ message: error.message });
        }

        res.redirect('/admin/tutor-applications?error=' + encodeURIComponent(error.message));
    }
};

const toggleTutorBlock = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const adminId = req.session.adminId;

        await adminService.toggleTutorBlock(tutorId, adminId);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: true });
        }

        res.redirect('/admin/tutors');
    } catch (error) {
        console.error('Toggle block error:', error);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ message: error.message });
        }

        res.redirect('/admin/tutors?error=' + encodeURIComponent(error.message));
    }
};

const postLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    try {
        const admin = await adminService.loginAdmin(email, password);

        if (!admin) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        req.session.adminId = admin._id;

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ redirect: '/admin/dashboard' });
        }

        res.redirect('/admin/dashboard');
    } catch (err) {
        const errorMsg = err.message || "Login failed";

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ message: errorMsg });
        }

        res.redirect(`/admin/login?error=${encodeURIComponent(errorMsg)}`);
    }
};

const logout = (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
};

const getStudents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const blocked = req.query.blocked || 'all';

        // Build query
        let query = { role: 'user' };

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (blocked !== 'all') {
            query.isBlocked = blocked === 'blocked';
        }

        const totalStudents = await User.countDocuments(query);
        const students = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalStudents / limit);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render("admin/students", {
            students,
            search,
            blocked,
            currentPage: 'students',
            pendingCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalStudents,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });

    } catch (err) {
        console.error('Error fetching students:', err);
        res.render("admin/students", {
            students: [],
            search: '',
            blocked: 'all',
            currentPage: 'students',
            pendingCount: 0,
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalStudents: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
};

const toggleStudentBlock = async (req, res) => {
    try {
        const { studentId } = req.params;
        const adminId = req.session.adminId;

        const student = await User.findById(studentId);
        if (!student || student.role !== 'user') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        student.isBlocked = !student.isBlocked;
        student.blockedBy = student.isBlocked ? adminId : null;
        student.blockedAt = student.isBlocked ? new Date() : null;

        await student.save();

        const action = student.isBlocked ? 'blocked' : 'unblocked';

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({
                success: true,
                message: `Student ${action} successfully`,
                isBlocked: student.isBlocked
            });
        }

        res.redirect('/admin/students');
    } catch (error) {
        console.error('Toggle student block error:', error);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.redirect('/admin/students?error=' + encodeURIComponent(error.message));
    }
};

export {
    getLogin,
    postLogin,
    logout,
    getDashboard,
    getTutorApplications,
    getTutors,
    approveTutor,
    rejectTutor,
    toggleTutorBlock,
    getStudents,
    toggleStudentBlock
};

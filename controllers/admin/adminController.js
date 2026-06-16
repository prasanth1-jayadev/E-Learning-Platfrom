import * as adminService from '../../service/adminService.js';

const getLogin = (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma':  'no-cache',
        'Expires': '0'
    });
    res.render('admin/login');
};

const getDashboard = async (req, res) => {
    try {
        const timeRange = req.query.range || '7days';

        const [pendingTutors, allTutors, platformStats, analytics, recentOrders] = await Promise.all([
            adminService.getPendingTutorApplications(),
            adminService.getTutorApplications(),
            adminService.getPlatformStats(),
            adminService.getDashboardAnalytics(timeRange),
            adminService.getRecentOrders(10)
        ]);

        res.render('admin/dashboard', {
            pendingCount:   pendingTutors.length,
            totalTutors:    allTutors.length,
            totalStudents:  platformStats.totalStudents,
            totalCourses:   platformStats.totalCourses,
            totalRevenue:   platformStats.totalRevenue,
            analytics,
            recentOrders,
            timeRange,
            currentPage:    'dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            pendingCount:  0,
            totalTutors:   0,
            totalStudents: 0,
            totalCourses:  0,
            totalRevenue:  0,
            analytics: { revenueData: [], tutorGrowth: [], topCourses: [], categoryDistribution: [] },
            recentOrders:  [],
            timeRange:     '7days',
            currentPage:   'dashboard'
        });
    }
};

const getTutorApplications = async (req, res) => {
    try {
        const page    = parseInt(req.query.page) || 1;
        const search  = req.query.search || '';
        const success = req.query.success;
        const error   = req.query.error;

        const [result, pendingCount, registrationStats] = await Promise.all([
            adminService.getTutorApplications(page, 4, search),
            adminService.getPendingTutorApplications().then(t => t.length),
            adminService.getTutorRegistrationStats()
        ]);

        res.render('admin/tutor-applications', {
            tutors:  result.tutors,
            search,
            success,
            error,
            currentPage:     'tutor-applications',
            pendingCount,
            registrationStats,
            pagination: {
                currentPage:        result.page,
                totalPages:         result.pages,
                totalApplications:  result.total,
                hasNext:            result.hasNext,
                hasPrev:            result.hasPrev,
                nextPage:           result.page + 1,
                prevPage:           result.page - 1
            }
        });
    } catch (error) {
        console.error('Error fetching tutor applications:', error);
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

const getTutors = async (req, res) => {
    try {
        const page    = parseInt(req.query.page) || 1;
        const search  = req.query.search || '';
        const blocked = req.query.blocked || 'all';

        const [result, pendingCount] = await Promise.all([
            adminService.getTutors(page, 5, search, blocked),
            adminService.getPendingTutorApplications().then(t => t.length)
        ]);

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
        await adminService.approveTutor(tutorId, req.session.adminId);

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
        await adminService.rejectTutor(tutorId, req.session.adminId);

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
        await adminService.toggleTutorBlock(req.params.tutorId, req.session.adminId);

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

const toggleTutorCertified = async (req, res) => {
    try {
        const result = await adminService.toggleTutorCertified(req.params.tutorId);

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ success: true, message: result.message, isCertified: result.isCertified });
        }
        res.redirect('/admin/tutors');
    } catch (error) {
        console.error('Toggle certified error:', error);
        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.redirect('/admin/tutors?error=' + encodeURIComponent(error.message));
    }
};

const postLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields required' });
    }

    try {
        const admin = await adminService.loginAdmin(email, password);

        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        req.session.adminId = admin._id;

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({ redirect: '/admin/dashboard' });
        }
        res.redirect('/admin/dashboard');
    } catch (err) {
        const errorMsg = err.message || 'Login failed';
        if (req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({ message: errorMsg });
        }
        res.redirect(`/admin/login?error=${encodeURIComponent(errorMsg)}`);
    }
};

const logout = (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma':  'no-cache',
        'Expires': '0'
    });
    req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
};

const getStudents = async (req, res) => {
    try {
        const page    = parseInt(req.query.page) || 1;
        const search  = req.query.search || '';
        const blocked = req.query.blocked || 'all';

        const [data, pendingCount] = await Promise.all([
            adminService.getStudents(page, 10, search, blocked),
            adminService.getPendingTutorApplications().then(t => t.length)
        ]);

        res.render('admin/students', {
            students:    data.students,
            search,
            blocked,
            currentPage: 'students',
            pendingCount,
            pagination: {
                currentPage:    data.page,
                totalPages:     data.totalPages,
                totalStudents:  data.totalStudents,
                hasNext:        data.hasNext,
                hasPrev:        data.hasPrev,
                nextPage:       data.nextPage,
                prevPage:       data.prevPage
            }
        });
    } catch (err) {
        console.error('Error fetching students:', err);
        res.render('admin/students', {
            students: [], search: '', blocked: 'all', currentPage: 'students', pendingCount: 0,
            pagination: { currentPage: 1, totalPages: 0, totalStudents: 0, hasNext: false, hasPrev: false }
        });
    }
};

const toggleStudentBlock = async (req, res) => {
    try {
        const { student, action } = await adminService.toggleStudentBlock(
            req.params.studentId,
            req.session.adminId
        );

        if (req.headers['content-type']?.includes('application/json')) {
            return res.json({
                success:   true,
                message:   `Student ${action} successfully`,
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

const getTutorDetail = async (req, res) => {
    try {
        const result       = await adminService.getTutorDetail(req.params.tutorId);
        const pendingCount = await adminService.getPendingTutorApplications().then(t => t.length);

        res.render('admin/tutor-detail', {
            tutor:       result.tutor,
            courses:     result.courses,
            currentPage: 'tutors',
            pendingCount
        });
    } catch (error) {
        console.error('Get tutor detail error:', error);
        res.redirect('/admin/tutors?error=' + encodeURIComponent(error.message));
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
    toggleTutorCertified,
    getStudents,
    toggleStudentBlock,
    getTutorDetail
};

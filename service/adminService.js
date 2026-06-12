import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import { comparePassword } from '../helpers/passwordHelper.js';

const loginAdmin = async (email, password) => {
    const admin = await User.findOne({ email });

    if (!admin) {
        throw new Error('Invalid credentials - user not found');
    }

    if (!admin.password) {
        throw new Error('Admin password not set - please run setupAdmin.js');
    }

    const match = await comparePassword(password.trim(), admin.password);

    if (!match) {
        throw new Error('Invalid credentials - wrong password');
    }

    if (admin.role !== 'admin') {
        throw new Error('Not authorized as admin - user role is: ' + admin.role);
    }

    return admin;
}

const getTutorApplications = async (page = 1, limit = 10, search = '') => {
    const skip = (page - 1) * limit;
    let query = {
        isVerified: true,
        approvalStatus: 'pending'
    };

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }


    

    const tutors = await Tutor.find(query)
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Tutor.countDocuments(query);

    return {
        tutors,
        total,
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
    };
}

const getTutorRegistrationStats = async () => {
    try {
        // Get last 30 days of tutor registrations
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const registrationData = await Tutor.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    count: 1
                }
            }
        ]);

        const statusBreakdown = await Tutor.aggregate([
            {
                $group: {
                    _id: '$approvalStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0
        };

        statusBreakdown.forEach(item => {
            stats[item._id] = item.count;
        });

        return {
            registrationData,
            stats
        };
    } catch (error) {
        console.error('Get tutor registration stats error:', error);
        return {
            registrationData: [],
            stats: { pending: 0, approved: 0, rejected: 0 }
        };
    }
};

const getPendingTutorApplications = async () => {
    return await Tutor.find({
        isVerified: true,
        approvalStatus: 'pending'
    }).sort({ appliedAt: -1 });
}

const approveTutor = async (tutorId, adminId) => {
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
        throw new Error('Tutor not found');
    }

    if (tutor.approvalStatus === 'approved') {
        throw new Error('Tutor already approved');
    }

    await Tutor.findByIdAndUpdate(tutorId, {
        approvalStatus: 'approved',
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId
    });

    return await Tutor.findById(tutorId);
}

const rejectTutor = async (tutorId, adminId) => {
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
        throw new Error('Tutor not found');
    }

    if (tutor.approvalStatus === 'rejected') {
        throw new Error('Tutor already rejected');
    }

    await Tutor.findByIdAndUpdate(tutorId, {
        approvalStatus: 'rejected',
        isApproved: false,
        approvedAt: new Date(),
        approvedBy: adminId
    });

    return await Tutor.findById(tutorId);
}

const getTutors = async (page = 1, limit = 5, search = '', blocked = 'all') => {
    const skip = (page - 1) * limit;
    let query = {
        isVerified: true,
        approvalStatus: 'approved'
    };

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (blocked !== 'all') {
        query.isBlocked = blocked === 'blocked';
    }

    const tutors = await Tutor.find(query)
        .sort({ approvedAt: 1 })
        .skip(skip)
        .limit(limit);

    const total = await Tutor.countDocuments(query);

    return {
        tutors,
        total,
        page,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
    };
}

const toggleTutorBlock = async (tutorId, adminId) => {
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
        throw new Error('Tutor not found');
    }

    const isBlocked = !tutor.isBlocked;
    await Tutor.findByIdAndUpdate(tutorId, {
        isBlocked,
        blockedBy: isBlocked ? adminId : null,
        blockedAt: isBlocked ? new Date() : null
    });

    return await Tutor.findById(tutorId);
}

const toggleTutorCertified = async (tutorId) => {
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
        throw new Error('Tutor not found');
    }

    if (tutor.approvalStatus !== 'approved') {
        throw new Error('Only approved tutors can be certified');
    }

    const isCertified = !tutor.isCertified;
    await Tutor.findByIdAndUpdate(tutorId, {
        isCertified
    });

    return {
        isCertified,
        message: isCertified ? 'Tutor marked as certified successfully' : 'Certification removed successfully'
    };
}

const getTutorDetail = async (tutorId) => {
    const tutor = await Tutor.findById(tutorId).lean();
    if (!tutor) {
        throw new Error('Tutor not found');
    }

    const Course = (await import('../models/Course.js')).default;
    
    const courses = await Course.find({ tutor: tutorId })
        .select('title description price thumbnail isPublished lessons enrolledStudents')
        .lean();

    return {
        tutor,
        courses
    };
}

const getDashboardAnalytics = async (timeRange = '7days') => {
    try {
        const now = new Date();
        let startDate = new Date();
        
        switch(timeRange) {
            case '7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 30);
                break;
            case '1year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        const revenueData = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    revenue: { $divide: ['$revenue', 100] } 
                }
            }
        ]);

        const tutorGrowth = await Tutor.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    newTutors: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    newTutors: 1
                }
            }
        ]);

        const topCourses = await Course.aggregate([
            {
                $match: {
                    isPublished: true
                }
            },
            {
                $project: {
                    title: 1,
                    enrollments: { $size: '$enrolledStudents' }
                }
            },
            {
                $sort: { enrollments: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 0,
                    courseTitle: '$title',
                    enrollments: 1
                }
            }
        ]);

        const categoryDistribution = await Course.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalCourses: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    totalCourses: 1
                }
            },
            {
                $sort: { totalCourses: -1 }
            }
        ]);

        return {
            revenueData,
            tutorGrowth,
            topCourses,
            categoryDistribution
        };
    } catch (error) {
        console.error('Analytics error:', error);
        return {
            revenueData: [],
            tutorGrowth: [],
            topCourses: [],
            categoryDistribution: []
        };
    }
};

const getRecentOrders = async (limit = 10) => {
    try {
        const orders = await Payment.find({ status: 'completed' })
            .populate('user', 'fullName email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        
        return orders;
    } catch (error) {
        console.error('Get recent orders error:', error);
        return [];
    }
};

export {
    loginAdmin,
    getTutorApplications,
    getPendingTutorApplications,
    approveTutor,
    rejectTutor,
    getTutors,
    toggleTutorBlock,
    toggleTutorCertified,
    getTutorDetail,
    getDashboardAnalytics,
    getRecentOrders,
    getTutorRegistrationStats
};

import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
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

export {
    loginAdmin,
    getTutorApplications,
    getPendingTutorApplications,
    approveTutor,
    rejectTutor,
    getTutors,
    toggleTutorBlock
};

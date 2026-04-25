import User from '../models/User.js';
import Tutor from '../models/Tutor.js';

const isUser = async (req, res, next) => {
    if ((req.isAuthenticated && req.isAuthenticated() && req.user && req.user.type === 'user') ||
        (req.session && req.session.userId)) {
        if (!req.session.userId && req.user) {
            req.session.userId = req.user._id || req.user.id;
        }

        try {
            const user = await User.findById(req.session.userId);

            if (!user) {
                req.session.destroy();
                return res.redirect('/user/login?error=account_not_found');
            }

            if (user.isBlocked) {
                req.session.destroy();
                return res.redirect('/user/login?error=account_blocked');
            }
        } catch (error) {
            console.error('User block check error:', error);
            return res.redirect('/user/login');
        }

        return next();
    }
    return res.redirect('/user/login');
};




const isTutor = async (req, res, next) => {
    if ((req.isAuthenticated && req.isAuthenticated() && req.user && req.user.type === 'tutor') ||
        (req.session && req.session.tutorId)) {
        if (!req.session.tutorId && req.user) {
            req.session.tutorId = req.user._id || req.user.id;
        }

        try {
            const tutor = await Tutor.findById(req.session.tutorId);

            if (!tutor) {
                req.session.destroy();
                return res.redirect('/tutor/login?error=account_not_found');
            }

            if (tutor.isBlocked) {
                req.session.destroy();
                return res.redirect('/tutor/login?error=account_blocked');
            }
        } catch (error) {
            console.error('Tutor block check error:', error);
            return res.redirect('/tutor/login');
        }

        return next();
    }
    return res.redirect('/tutor/login');
};




const isTutorApproved = async (req, res, next) => {
    if (!req.session || !req.session.tutorId) {
        return res.redirect('/tutor/login');
    }

    try {
        const tutor = await Tutor.findById(req.session.tutorId);

        if (!tutor) {
            return res.redirect('/tutor/login');
        }

        if (tutor.isBlocked) {
            req.session.destroy();
            return res.redirect('/tutor/login?error=account_blocked');
        }

        if (tutor.approvalStatus !== 'approved') {
            return res.redirect('/tutor/dashboard?error=approval_required');
        }

        next();
    } catch (error) {
        console.error('Approval check error:', error);
        return res.redirect('/tutor/login');
    }
};



const isAdmin = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    if (req.session && req.session.adminId) {
        req.session.touch();
        return next();
    }

    return res.redirect('/admin/login');
};

const redirectIfUser = (req, res, next) => {
    if (req.session && req.session.userId) return res.redirect('/user/home');
    next();
};

const redirectIfTutor = (req, res, next) => {
    if (req.session && req.session.tutorId) return res.redirect('/tutor/dashboard');
    next();
};

const redirectIfAdmin = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
    next();
};

export { isUser, isTutor, isTutorApproved, isAdmin, redirectIfUser, redirectIfTutor, redirectIfAdmin };

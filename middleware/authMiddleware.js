
const isUser = (req, res, next) => {
    if ((req.isAuthenticated && req.isAuthenticated() && req.user && req.user.type === 'user') || 
        (req.session && req.session.userId)) {
        if (!req.session.userId && req.user) {
            req.session.userId = req.user._id || req.user.id;
        }
        return next();
    }
    return res.redirect('/user/login');
};


const isTutor = (req, res, next) => {
    if ((req.isAuthenticated && req.isAuthenticated() && req.user && req.user.type === 'tutor') || 
        (req.session && req.session.tutorId)) {
        if (!req.session.tutorId && req.user) {
            req.session.tutorId = req.user._id || req.user.id;
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
        const Tutor = require('../models/Tutor');
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

module.exports = { isUser, isTutor, isTutorApproved, isAdmin, redirectIfUser, redirectIfTutor, redirectIfAdmin };

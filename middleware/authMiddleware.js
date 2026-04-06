// Protect user routes — redirect to login if not logged in
const isUser = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    return res.redirect('/user/login');
};

// Protect tutor routes
const isTutor = (req, res, next) => {
    if (req.session && req.session.tutorId) return next();
    return res.redirect('/tutor/login');
};

// Protect admin routes
const isAdmin = (req, res, next) => {
    if (req.session && req.session.adminId) return next();
    return res.redirect('/admin/login');
};

// Block logged-in users from accessing login/signup pages
const redirectIfUser = (req, res, next) => {
    if (req.session && req.session.userId) return res.redirect('/user/home');
    next();
};

const redirectIfTutor = (req, res, next) => {
    if (req.session && req.session.tutorId) return res.redirect('/tutor/dashboard');
    next();
};

const redirectIfAdmin = (req, res, next) => {
    if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
    next();
};

module.exports = { isUser, isTutor, isAdmin, redirectIfUser, redirectIfTutor, redirectIfAdmin };

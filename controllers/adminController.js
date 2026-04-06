const adminService = require('../service/adminService');

const getLogin = (req, res) => {
  res.render('admin/login');
};

const getDashboard = (req, res) => {
  res.render('admin/dashboard');
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

    // redirect depending on request type
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
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
};

module.exports = {
  getLogin,
  postLogin,
  logout,
  getDashboard
};
const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin }      = require('../middleware/authMiddleware');



router.get('/login',    adminController.getLogin);
router.post('/login',   adminController.postLogin);
router.get('/logout',   adminController.logout);
router.get('/dashboard',isAdmin,adminController.getDashboard)



module.exports = router;

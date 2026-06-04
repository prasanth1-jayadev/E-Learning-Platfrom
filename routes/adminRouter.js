import express from 'express';
import * as adminController from '../controllers/admin/adminController.js';
import * as categoryController from '../controllers/admin/categoryController.js';
import * as courseController from '../controllers/admin/courseController.js';
import * as orderController from '../controllers/admin/orderController.js';
import * as walletController from '../controllers/admin/walletController.js';
import * as couponController from '../controllers/admin/couponController.js';
import * as salesReportController from '../controllers/admin/salesReportController.js';
import { isAdmin, redirectIfAdmin } from '../middleware/authMiddleware.js';


const router = express.Router();

router.get('/login', redirectIfAdmin, adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

router.get('/dashboard', isAdmin, adminController.getDashboard);

router.get('/tutor-applications', isAdmin, adminController.getTutorApplications);
router.get('/tutors', isAdmin, adminController.getTutors);
router.get('/tutor/:tutorId', isAdmin, adminController.getTutorDetail);
router.post('/approve-tutor/:tutorId', isAdmin, adminController.approveTutor);
router.post('/reject-tutor/:tutorId', isAdmin, adminController.rejectTutor);
router.post('/toggle-block/:tutorId', isAdmin, adminController.toggleTutorBlock);
router.post('/toggle-certified/:tutorId', isAdmin, adminController.toggleTutorCertified);

router.get('/students', isAdmin, adminController.getStudents);
router.post('/toggle-student-block/:studentId', isAdmin, adminController.toggleStudentBlock);

router.get('/categories', isAdmin, categoryController.getCategories);
router.post('/categories/add', isAdmin, categoryController.addCategory);
router.post('/categories/:id/edit', isAdmin, categoryController.editCategory);
router.post('/categories/:id/toggle-status', isAdmin, categoryController.toggleStatus);

router.get('/courses', isAdmin, courseController.getCourses);
router.get('/course/:id', isAdmin, courseController.getCourseDetail);
router.post('/course/:id/toggle-status', isAdmin, courseController.toggleCourseStatus);
router.post('/course/:id/delete', isAdmin, courseController.deleteCourse);



router.get('/orders', isAdmin, orderController.getOrders);
router.get('/order/:id', isAdmin, orderController.getOrderDetail);
router.post('/order/:id/update-status', isAdmin, orderController.updateOrderStatus);

// Wallet routes
router.get('/wallet', isAdmin, walletController.getWalletOverview);
router.get('/wallet/tutor/:tutorId', isAdmin, walletController.getTutorWalletDetail);

// Coupon routes
router.get('/coupons', isAdmin, couponController.getCouponsPage);
router.post('/coupons/create', isAdmin, couponController.createCoupon);
router.post('/coupons/:id/toggle', isAdmin, couponController.toggleCouponStatus);
router.post('/coupons/:id/delete', isAdmin, couponController.deleteCoupon);

// Sales Report routes
router.get('/sales-report', isAdmin, salesReportController.getSalesReport);
router.get('/sales-report/download-pdf', isAdmin, salesReportController.downloadPDF);
router.get('/sales-report/download-excel', isAdmin, salesReportController.downloadExcel);





export default router;

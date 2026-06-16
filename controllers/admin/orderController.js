import Payment from '../../models/Payment.js';
import * as adminService from '../../service/adminService.js';



const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const dateRange = req.query.dateRange || 'all';

        // Build query
        let query = {};

        if (status !== 'all') {
            query.status = status;
        }

        if (dateRange !== 'all') {
            const now = new Date();
            let startDate;

            switch (dateRange) {
                case '7days':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case '30days':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
                case '3months':
                    startDate = new Date(now.setMonth(now.getMonth() - 3));
                    break;
            }

            if (startDate) {
                query.createdAt = { $gte: startDate };
            }
        }

        const totalOrders = await Payment.countDocuments(query);

        let orders = await Payment.find(query)
            .populate('user', 'fullName email')
            .populate('course', 'title thumbnail price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        if (search) {
            orders = orders.filter(order => {
                const searchLower = search.toLowerCase();
                return (
                    order.orderId.toLowerCase().includes(searchLower) ||
                    order.paymentId.toLowerCase().includes(searchLower) ||
                    order.user?.fullName.toLowerCase().includes(searchLower) ||
                    order.user?.email.toLowerCase().includes(searchLower)
                );
            });
        }

        const totalPages = Math.ceil(totalOrders / limit);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render('admin/orders', {
            orders,
            search,
            status,
            dateRange,
            currentPage: 'orders',
            pendingCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.render('admin/orders', {
            orders: [],
            search: '',
            status: 'all',
            dateRange: 'all',
            currentPage: 'orders',
            pendingCount: 0,
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalOrders: 0,
                hasNext: false,
                hasPrev: false
            }
        });
    }
};


const getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Payment.findById(id)
            .populate('user', 'fullName email')
            .populate({
                path: 'course',
                select: 'title thumbnail price tutor',
                populate: {
                    path: 'tutor',
                    select: 'fullName email'
                }
            });

        if (!order) {
            return res.redirect('/admin/orders?error=' + encodeURIComponent('Order not found'));
        }

        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);

        res.render('admin/order-detail', {
            order,
            currentPage: 'orders',
            pendingCount
        });

    } catch (error) {
        console.error('Error fetching order detail:', error);
        res.redirect('/admin/orders?error=' + encodeURIComponent('Failed to fetch order details'));
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'completed', 'failed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Payment.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        await order.save();

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            status: order.status
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};

export { getOrders, getOrderDetail, updateOrderStatus };

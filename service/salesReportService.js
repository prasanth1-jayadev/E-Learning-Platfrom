
import Payment from '../models/Payment.js';

/**
 * @param {'today'|'week'|'month'|'year'|'custom'} filter
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {object} 
 */
const buildDateFilter = (filter, startDate, endDate) => {
    const now = new Date();
    let start, end;

    switch (filter) {
        case 'today':
            start = new Date(new Date().setHours(0, 0, 0, 0));
            end   = new Date(new Date().setHours(23, 59, 59, 999));
            break;
        case 'week':
            start = new Date(now);
            start.setDate(now.getDate() - 7);
            end = new Date();
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            start = startDate ? new Date(startDate) : null;
            end   = endDate   ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
            break;
        default:
            start = null;
            end   = null;
    }

    if (start && end) return { createdAt: { $gte: start, $lte: end } };
    return {};
};

/**
 
  @returns {Payment[]}
 */
const getSalesData = async (filter = 'month', startDate, endDate) => {
    const dateFilter = buildDateFilter(filter, startDate, endDate);
    const query      = { status: 'completed', ...dateFilter };

    return Payment.find(query)
        .populate('user',   'fullName email')
        .populate('course', 'title price')
        .sort({ createdAt: -1 })
        .lean();
};

/**
 * @returns {Payment[]}
 */
const getLatestOrders = async (limit = 10) => {
    return Payment.find({ status: 'completed' })
        .populate('user',   'fullName email')
        .populate('course', 'title price')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * @returns {Array<{ _id: string, revenue: number, count: number }>}
 */
const getMonthlySalesData = async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id:     { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                revenue: { $sum: '$amount' },
                count:   { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

/**
 * @param {Payment[]} orders
 */
const computeSalesStats = (orders) => {
    const totalRevenue       = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const platformCommission = totalRevenue * 0.2;
    const tutorEarnings      = totalRevenue * 0.8;
    return { totalRevenue, totalOrders: orders.length, platformCommission, tutorEarnings };
};

export {
    buildDateFilter,
    getSalesData,
    getLatestOrders,
    getMonthlySalesData,
    computeSalesStats,
};

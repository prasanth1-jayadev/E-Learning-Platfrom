import Wallet from '../models/Wallet.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';

export const getOrCreateWallet = async (tutorId) => {
    try {
        let wallet = await Wallet.findOne({ tutor: tutorId });
        
        if (!wallet) {
            wallet = new Wallet({
                tutor: tutorId,
                balance: 0,
                totalEarnings: 0,
                totalWithdrawn: 0,
                transactions: []
            });
            await wallet.save();
        }
        
        return wallet;
    } catch (error) {
        console.error('Error getting/creating wallet:', error);
        throw error;
    }
};

export const addCredit = async (tutorId, amount, description, orderId = null, courseId = null) => {
    try {
        const wallet = await getOrCreateWallet(tutorId);
        
        // Set release date to 7 days from now
        const releaseDate = new Date();
        releaseDate.setDate(releaseDate.getDate() + 7);
        
        // Add to pending balance (not available for withdrawal yet)
        wallet.pendingBalance += amount;
        wallet.totalEarnings += amount;
        
        wallet.transactions.push({
            type: 'credit',
            amount,
            description,
            orderId,
            courseId,
            status: 'pending',
            releaseDate
        });
        
        await wallet.save();
        return wallet;
    } catch (error) {
        console.error('Error adding credit:', error);
        throw error;
    }
};


export const addDebit = async (tutorId, amount, description) => {
    try {
        const wallet = await getOrCreateWallet(tutorId);
        
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }
        
        wallet.balance -= amount;
        wallet.totalWithdrawn += amount;
        
        wallet.transactions.push({
            type: 'debit',
            amount,
            description,
            status: 'completed'
        });
        
        await wallet.save();
        return wallet;
    } catch (error) {
        console.error('Error adding debit:', error);
        throw error;
    }
};

export const getWalletDetails = async (tutorId) => {
    try {
        let wallet = await Wallet.findOne({ tutor: tutorId })
            .populate('tutor', 'fullName email')
            .populate({
                path: 'transactions.orderId',
                select: 'orderId amount status'
            })
            .populate({
                path: 'transactions.courseId',
                select: 'title'
            });
        
        if (!wallet) {
            wallet = await getOrCreateWallet(tutorId);
            wallet = await Wallet.findById(wallet._id).populate('tutor', 'fullName email');
        }
        
        return wallet;
    } catch (error) {
        console.error('Error getting wallet details:', error);
        throw error;
    }
};

export const getRevenueStats = async (tutorId) => {
    try {
        const wallet = await getWalletDetails(tutorId);
        
        const courses = await Course.find({ tutor: tutorId })
            .populate('enrolledStudents');
        
        const courseRevenue = courses.map(course => ({
            courseId: course._id,
            title: course.title,
            students: course.enrolledStudents.length,
            revenue: course.enrolledStudents.length * course.price
        }));
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyRevenue = wallet.transactions
            .filter(t => t.type === 'credit' && t.createdAt >= sixMonthsAgo)
            .reduce((acc, transaction) => {
                const month = new Date(transaction.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
                acc[month] = (acc[month] || 0) + transaction.amount;
                return acc;
            }, {});
        
        return {
            wallet,
            courseRevenue,
            monthlyRevenue
        };
    } catch (error) {
        console.error('Error getting revenue stats:', error);
        throw error;
    }
};

export const getAllWallets = async () => {
    try {
        const wallets = await Wallet.find()
            .populate('tutor', 'fullName email')
            .sort({ totalEarnings: -1 });
        
        return wallets;
    } catch (error) {
        console.error('Error getting all wallets:', error);
        throw error;
    }
};

/**
 * Get platform revenue statistics (admin)
 */
export const getPlatformStats = async () => {
    try {
        const wallets = await Wallet.find();
        
        const totalPlatformEarnings = wallets.reduce((sum, wallet) => sum + wallet.totalEarnings, 0);
        const totalWithdrawn = wallets.reduce((sum, wallet) => sum + wallet.totalWithdrawn, 0);
        const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
        
        const completedPayments = await Payment.find({ status: 'completed' });
        const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        const platformCommission = totalRevenue * 0.2;
        
        return {
            totalRevenue,
            totalPlatformEarnings,
            totalWithdrawn,
            totalBalance,
            platformCommission,
            tutorEarnings: totalRevenue - platformCommission
        };
    } catch (error) {
        console.error('Error getting platform stats:', error);
        throw error;
    }
};

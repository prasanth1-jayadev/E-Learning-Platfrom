import * as walletService from '../../service/walletService.js';
import * as adminService from '../../service/adminService.js';




export const getWalletOverview = async (req, res) => {
    try {
        const wallets = await walletService.getAllWallets();
        const platformStats = await walletService.getPlatformStats();
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);
        
        res.render('admin/wallet', {
            wallets,
            platformStats,
            currentPage: 'wallet',
            pendingCount
        });
        
    } catch (error) {
        console.error('Error fetching wallet overview:', error);
        res.render('admin/wallet', {
            wallets: [],
            platformStats: {
                totalRevenue: 0,
                totalPlatformEarnings: 0,
                totalWithdrawn: 0,
                totalBalance: 0,
                platformCommission: 0,
                tutorEarnings: 0
            },
            currentPage: 'wallet',
            pendingCount: 0,
            error: 'Failed to load wallet data'
        });
    }
};




export const getTutorWalletDetail = async (req, res) => {
    try {
        const { tutorId } = req.params;
        
        const { wallet, courseRevenue, monthlyRevenue } = await walletService.getRevenueStats(tutorId);
        const pendingCount = await adminService.getPendingTutorApplications().then(tutors => tutors.length);
        
        const sortedTransactions = wallet.transactions.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        res.render('admin/tutor-wallet-detail', {
            wallet,
            transactions: sortedTransactions,
            courseRevenue,
            monthlyRevenue,
            currentPage: 'wallet',
            pendingCount
        });
        
    } catch (error) {
        console.error('Error fetching tutor wallet detail:', error);
        res.redirect('/admin/wallet?error=' + encodeURIComponent('Failed to load wallet details'));
    }
};

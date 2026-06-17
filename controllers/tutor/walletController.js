import * as walletService from '../../service/walletService.js';
import User from '../../models/User.js';
import { sendNotification } from '../../service/notificationService.js';

export const getWallet = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.redirect('/tutor/login');
        }
        
        const tutorId = req.user._id;
        
        const { wallet, courseRevenue, monthlyRevenue } = await walletService.getRevenueStats(tutorId);
        
        if (!wallet.tutor || !wallet.tutor.fullName) {
            await wallet.populate('tutor', 'fullName email');
        }
        
        const sortedTransactions = wallet.transactions.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        res.render('tutor/wallet', {
            tutor: req.user,
            wallet,
            transactions: sortedTransactions,
            courseRevenue,
            monthlyRevenue,
            currentPage: 'wallet'
        });
        
    } catch (error) {
        console.error('Error fetching wallet:', error);
        console.error('req.user:', req.user);
        
        if (req.user && req.user._id) {
            res.render('tutor/wallet', {
                tutor: req.user,
                wallet: { balance: 0, totalEarnings: 0, totalWithdrawn: 0, transactions: [] },
                transactions: [],
                courseRevenue: [],
                monthlyRevenue: {},
                currentPage: 'wallet',
                error: 'Failed to load wallet data'
            });
        } else {
            res.redirect('/tutor/login');
        }
    }
};


export const requestWithdrawal = async (req, res) => {
    try {
        const tutorId = req.user._id;
        const { amount } = req.body;
        
        const withdrawAmount = parseFloat(amount);
        
        if (!withdrawAmount || withdrawAmount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid withdrawal amount' 
            });
        }
        
        const wallet = await walletService.getOrCreateWallet(tutorId);
        
        if (wallet.balance < withdrawAmount) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance' 
            });
        }
        
        await walletService.addDebit(
            tutorId, 
            withdrawAmount, 
            'Withdrawal request'
        );

            const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
          await sendNotification({
              recipientId: admin._id,
              recipientType: 'user',
              title: 'New Withdrawal Request',
              message: `Tutor ${req.user.fullName} has requested a withdrawal of ₹${withdrawAmount}.`,
              type: 'withdrawal_request',
              relatedId: wallet._id
          });
      }


        
        res.json({ 
            success: true, 
            message: 'Withdrawal request submitted successfully',
            newBalance: wallet.balance - withdrawAmount
        });
        
    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to process withdrawal request' 
        });
    }
};

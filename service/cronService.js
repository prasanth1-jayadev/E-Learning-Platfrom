import cron from 'node-cron';
import Wallet from '../models/Wallet.js';


export const releasePendingFunds = async () => {
    try {
        console.log('Running pending funds release job...');
        
        const now = new Date();
        
        const wallets = await Wallet.find({
            'transactions.status': 'pending'
        });
        
        let totalReleased = 0;
        let walletsUpdated = 0;
        
        for (const wallet of wallets) {
            let walletModified = false;
            let amountToRelease = 0;
            
            wallet.transactions.forEach(transaction => {
                if (
                    transaction.status === 'pending' &&    
                    transaction.releaseDate && 
                    transaction.releaseDate <= now
                ) {
                    transaction.status = 'completed';
                    amountToRelease += transaction.amount;
                    walletModified = true;
                }
            });
            
            if (walletModified) {
                wallet.balance += amountToRelease;
                wallet.pendingBalance -= amountToRelease;
                
                await wallet.save();
                
                totalReleased += amountToRelease;
                walletsUpdated++;
                
                console.log(`Released ₹${amountToRelease} for tutor ${wallet.tutor}`);
            }
        }
        
        console.log(`Funds release completed: ${walletsUpdated} wallets updated, ₹${totalReleased} released`);
        
        return {
            walletsUpdated,
            totalReleased
        };
    } catch (error) {
        console.error('Error releasing pending funds:', error);
        throw error;
    }
};


 // Run every at 2:00 AM
export const initCronJobs = () => {
   
    cron.schedule('0 2 * * *', async () => {
        console.log('Starting scheduled pending funds release...');
        await releasePendingFunds();
    });
    
    console.log('Cron jobs initialized: Pending funds release scheduled for 2:00 AM daily');
};

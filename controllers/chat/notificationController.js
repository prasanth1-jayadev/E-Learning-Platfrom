import Notification from '../../models/Notification.js';

export const getNotifications = async (req, res) => {
    try {
        const recipientId = req.session.userId || req.session.tutorId;
        const recipientType = req.session.userId ? 'user' : 'tutor';

        if (!recipientId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const notifications = await Notification.find({ recipientId, recipientType })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipientId,
            recipientType,
            isRead: false
        });

        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error('Get notification error:', error);
        res.status(500).json({ success: false, message: 'failed to fetch the notification' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const recipientId = req.session.userId || req.session.tutorId;
        const { id } = req.params;

        if (!recipientId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await Notification.updateOne(
            { _id: id, recipientId },
            { $set: { isRead: true } }
        );
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const recipientId = req.session.userId || req.session.tutorId;
        const recipientType = req.session.userId ? 'user' : 'tutor';

        if (!recipientId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await Notification.updateMany(
            { recipientId, recipientType, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, message: 'Failed to update notifications' });
    }
};

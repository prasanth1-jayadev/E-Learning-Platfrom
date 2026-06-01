import Notification from "../models/Notification.js";
import { getIO } from "../config/socket.js";

export const sendNotification = async ({ recipientId, recipientType, title, message, type, relatedId }) => {
    try {
        const notification = new Notification({
            recipientId,
            recipientType,
            title,
            message,
            type,
            relatedId
        });
        await notification.save();

        try {
            const io = getIO();
            io.to(`${recipientType}_${recipientId}`).emit('new_notification', notification);
        } catch (socketErr) {
            console.log('socket emit skipped', socketErr.message);
        }
        return notification;
    } catch (error) {
        console.log('Error in sendNotification service', error);
    }
};
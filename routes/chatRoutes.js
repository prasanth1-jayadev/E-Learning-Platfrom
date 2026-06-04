import express from 'express';
import {
    getChatPage,
    getTutorChatPage,
    getConversations,
    getOrCreateIndividualConversation,
    getMessages
} from '../controllers/chat/chatController.js';
import {
    getNotifications,
    markAsRead,
    markAllAsRead
} from '../controllers/chat/notificationController.js';
import { isUser, isTutor, isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Page routes
router.get('/user', isUser, getChatPage);
router.get('/tutor', isTutor, getTutorChatPage);

// api routes
router.get('/conversations', isAuthenticated, getConversations);
router.post('/conversation/individual', isAuthenticated, getOrCreateIndividualConversation);
router.get('/messages/:conversationId', isAuthenticated, getMessages);

// Notification 
router.get('/notifications', isAuthenticated, getNotifications);
router.post('/notifications/:id/read', isAuthenticated, markAsRead);
router.post('/notifications/read-all', isAuthenticated, markAllAsRead);

export default router;


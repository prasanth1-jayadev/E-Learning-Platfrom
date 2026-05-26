import express from 'express';
import {
    getChatPage,
    getTutorChatPage,
    getConversations,
    getOrCreateIndividualConversation,
    getMessages
} from '../controllers/chat/chatController.js';
import { isUser, isTutor, isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Page routes
router.get('/user', isUser, getChatPage);
router.get('/tutor', isTutor, getTutorChatPage);

// API routes
router.get('/conversations', isAuthenticated, getConversations);
router.post('/conversation/individual', isAuthenticated, getOrCreateIndividualConversation);
router.get('/messages/:conversationId', isAuthenticated, getMessages);

export default router;

import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import Payment from '../../models/Payment.js';
import Course from '../../models/Course.js';

// GET - render chat page (user side)
export const getChatPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const User = (await import('../../models/User.js')).default;
        const user = await User.findById(userId).select('fullName email avatar');

        // Get all conversations for this user
        const conversations = await Conversation.find({
            $or: [
                { userId: userId, type: 'individual' },
                { 'participants.userId': userId, type: 'group' }
            ]
        })
        .populate('courseId', 'title thumbnail')
        .populate('tutorId', 'fullName avatar')
        .sort({ 'lastMessage.timestamp': -1 })
        .lean();

        res.render('user/chat', {
            user,
            conversations,
            currentPage: 'chat'
        });
    } catch (error) {
        console.error('Get chat page error:', error);
        res.redirect('/user/home');
    }
};

// GET - render chat page (tutor side)
export const getTutorChatPage = async (req, res) => {
    try {
        const tutorId = req.session.tutorId;
        const Tutor = (await import('../../models/Tutor.js')).default;
        const tutor = await Tutor.findById(tutorId);

        // Get all conversations for this tutor
        const conversations = await Conversation.find({ tutorId })
        .populate('courseId', 'title thumbnail')
        .populate('userId', 'fullName avatar')
        .sort({ 'lastMessage.timestamp': -1 })
        .lean();

        res.render('tutor/chat', {
            tutor,
            conversations,
            currentPage: 'chat'
        });
    } catch (error) {
        console.error('Get tutor chat page error:', error);
        res.redirect('/tutor/dashboard');
    }
};

// POST - get or create individual conversation
export const getOrCreateIndividualConversation = async (req, res) => {
    try {
        const { tutorId, courseId } = req.body;
        const userId = req.session.userId || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        // Check if user is enrolled in the course
        const User = (await import('../../models/User.js')).default;
        const user = await User.findById(userId);
        const isEnrolled = user?.enrolledCourses?.some(id => id.toString() === courseId.toString());

        if (!isEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must purchase this course to chat with the tutor'
            });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            type: 'individual',
            userId,
            tutorId,
            courseId
        });

        if (!conversation) {
            conversation = new Conversation({
                type: 'individual',
                userId,
                tutorId,
                courseId
            });
            await conversation.save();
        }

        await conversation.populate([
            { path: 'courseId', select: 'title thumbnail' },
            { path: 'tutorId', select: 'fullName avatar email' },
            { path: 'userId', select: 'fullName avatar email' }
        ]);

        res.json({ success: true, conversation });

    } catch (error) {
        console.error('Get/Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
};

// GET - get messages for a conversation
export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const userId = req.session.userId || req.user._id;
        const userType = req.session.userId ? 'user' : 'tutor';

        // Verify access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const hasAccess = verifyAccess(conversation, userId, userType);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const messages = await Message.find({ conversationId, isDeleted: false })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Message.countDocuments({ conversationId, isDeleted: false });

        res.json({
            success: true,
            messages,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + messages.length < total
            }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

// GET - get all conversations (API)
export const getConversations = async (req, res) => {
    try {
        const userId = req.session.userId || req.user?._id;
        const tutorId = req.session.tutorId;
        const userType = tutorId ? 'tutor' : 'user';

        let query = {};
        if (userType === 'tutor') {
            query.tutorId = tutorId;
        } else {
            query.$or = [
                { userId: userId, type: 'individual' },
                { 'participants.userId': userId, type: 'group' }
            ];
        }

        const conversations = await Conversation.find(query)
            .populate('courseId', 'title thumbnail')
            .populate('tutorId', 'fullName avatar')
            .populate('userId', 'fullName avatar')
            .sort({ 'lastMessage.timestamp': -1 })
            .lean();

        res.json({ success: true, conversations });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
};

// Helper
function verifyAccess(conversation, userId, userType) {
    const id = userId.toString();
    if (userType === 'tutor') {
        return conversation.tutorId.toString() === id;
    }
    if (conversation.type === 'individual') {
        return conversation.userId.toString() === id;
    }
    return conversation.participants.some(p => p.userId.toString() === id && p.isActive);
}

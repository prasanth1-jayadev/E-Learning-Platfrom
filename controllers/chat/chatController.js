import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import Payment from '../../models/Payment.js';
import Course from '../../models/Course.js';

export const getChatPage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const User = (await import('../../models/User.js')).default;
        const user = await User.findById(userId).select('fullName email avatar');

        const conversations = await Conversation.find({
           userId:userId,
           type:'individual'
        })
        .populate('courseId', 'title thumbnail')
        .populate('tutorId', 'fullName avatar')
        .sort({ 'lastMessage.timestamp': -1 })
        .lean();


         const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                senderType: 'tutor', // Unread message
                isRead: false
            });
            return { ...conv, unreadCount };
        }));

        res.render('user/chat', {
            user,
            conversations:conversationsWithUnread,
            currentPage: 'chat'
        });
    } catch (error) {
        console.error('Get chat page error:', error);
        res.redirect('/user/home');
    }
};

export const getTutorChatPage = async (req, res) => {
    try {
        const tutorId = req.session.tutorId;
        const Tutor = (await import('../../models/Tutor.js')).default;
        const tutor = await Tutor.findById(tutorId);

        // get all conv
        const conversations = await Conversation.find({ tutorId })
        .populate('courseId', 'title thumbnail')
        .populate('userId', 'fullName avatar')
        .sort({ 'lastMessage.timestamp': -1 })
        .lean();

        
        const validConversations = conversations.filter(conv => conv.userId);
      
         
          const conversationsWithUnread = await Promise.all(validConversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                senderType: 'user', 
                isRead: false
            });
            return { ...conv, unreadCount };
        }));



        res.render('tutor/chat', {
            tutor,
            conversations:conversationsWithUnread,
            currentPage: 'chat'
        });
    } catch (error) {
        console.error('Get tutor chat page error:', error);
        res.redirect('/tutor/dashboard');
    }
};

export const getOrCreateIndividualConversation = async (req, res) => {
    try {
        const { tutorId, courseId } = req.body;
        const userId = req.session.userId || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        const User = (await import('../../models/User.js')).default;
        const user = await User.findById(userId);
        const isEnrolled = user?.enrolledCourses?.some(id => id.toString() === courseId.toString());

        if (!isEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must purchase this course to chat with the tutor'
            });
        }

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

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const role = req.query.role;
        const userType = role || (req.session.userId ? 'user' : 'tutor');
        const userId = userType === 'user' ? req.session.userId : req.session.tutorId;

        //  access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const hasAccess = verifyAccess(conversation, userId, userType);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

      
        await Message.updateMany(
            { conversationId, senderType: { $ne: userType }, isRead: false },
            { $set: { isRead: true } }
        );

        const messages = await Message.find({ conversationId, isDeleted: false })
            .populate('senderId', 'fullName avatar')
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


export const getConversations = async (req, res) => {
    try {
        const role = req.query.role;
        const userType = role || (req.session.tutorId ? 'tutor' : 'user');
        const userId = req.session.userId;
        const tutorId = req.session.tutorId;

        let query = {};
        if (userType === 'tutor') {
            query.tutorId = tutorId;
        } else {
            query.userId = userId;
            query.type = 'individual';
        }

        const conversations = await Conversation.find(query)
            .populate('courseId', 'title thumbnail')
            .populate('tutorId', 'fullName avatar')
            .populate('userId', 'fullName avatar')
            .sort({ 'lastMessage.timestamp': -1 })
            .lean();

        const validConversations = conversations.filter(conv => {
            if (userType === 'tutor') {
                return conv.userId;
            } else {
                return conv.tutorId;
            }
        });

           const conversationsWithUnread = await Promise.all(validConversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                senderType: userType === 'tutor' ? 'user' : 'tutor',
                isRead: false
            });
            return { ...conv, unreadCount };
        }));
        res.json({ success: true, conversations: conversationsWithUnread });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const role = req.query.role;
        const userType = role || (req.session.userId ? 'user' : 'tutor');
        const userId = userType === 'user' ? req.session.userId : req.session.tutorId;

        console.log(`[Unread Count API] Role: ${role}, UserType: ${userType}, Session userId: ${req.session.userId}, Session tutorId: ${req.session.tutorId}`);

        if (!userId) {
            console.log(`[Unread Count API] Unauthorized: no userId found for type ${userType}`);
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        let query = {};
        let senderType = '';
        if (userType === 'tutor') {
            query.tutorId = userId;
            senderType = 'user';
        } else {
            query.userId = userId;
            query.type = 'individual';
            senderType = 'tutor';
        }

        const conversations = await Conversation.find(query).select('_id');
        const convIds = conversations.map(c => c._id);
        const count = await Message.countDocuments({
            conversationId: { $in: convIds },
            senderType,
            isRead: false
        });

        console.log(`[Unread Count API] Found ${convIds.length} conversations, unread messages count: ${count}`);

        res.json({ success: true, count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
    }
};



// Helper
function verifyAccess(conversation, userId, userType) {
    const id = userId.toString();
    if (userType === 'tutor') {
        return conversation.tutorId.toString() === id;
    }
   return conversation.userId.toString()===id;
   
}

import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import ChatNotification from '../models/ChatNotification.js';

export const setupChatHandlers = (io) => {
  io.on('connection', (socket) => {
    
    // Join conversation room
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }
        
        const hasAccess = verifyConversationAccess(
          conversation,
          socket.userId,
          socket.userType
        );
        
        if (!hasAccess) {
          return socket.emit('error', { message: 'Unauthorized access' });
        }
        
        socket.join(`conversation_${conversationId}`);


        await Message.updateMany(
          { conversationId, senderType: { $ne: socket.userType }, isRead: false },
          { $set: { isRead: true } }
        );
        
        socket.to(`conversation_${conversationId}`).emit('messages_read', { conversationId });
        socket.emit('joined_conversation', { conversationId });
        
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      socket.leave(`conversation_${conversationId}`);
      socket.emit('left_conversation', { conversationId });
    });

    socket.on('read_conversation', async (data) => {
      try {
        const { conversationId } = data;
        
        await Message.updateMany(
          { conversationId, senderType: { $ne: socket.userType }, isRead: false },
          { $set: { isRead: true } }
        );
        
        socket.to(`conversation_${conversationId}`).emit('messages_read', { conversationId });
        
        // Notify the reader's own room to update their unread message badge count in real-time
        io.to(`${socket.userType}_${socket.userId}`).emit('new_message_notification', {
          conversationId
        });
      } catch (error) {
        console.error('Mark as read error:', error);
      }
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const {
          conversationId,
          content,
          messageType = 'text',
          fileUrl,
          fileName,
          fileSize
        } = data;

        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const hasAccess = verifyConversationAccess(
          conversation,
          socket.userId,
          socket.userType
        );

        if (!hasAccess) {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        // Create message
        const message = new Message({
          conversationId,
          senderType: socket.userType,
          senderId: socket.userId,
          senderModel: socket.userType === 'user' ? 'User' : 'Tutor',
          messageType,
          content,
          fileUrl,
          fileName,
          fileSize
        });

        await message.save();

        await message.populate({
          path: 'senderId',
          select: 'fullName email avatar'
        });

        conversation.lastMessage = {
          content: messageType === 'text' ? content : `Sent a ${messageType}`,
          senderId: socket.userId,
          senderType: socket.userType,
          timestamp: new Date(),
          messageType
        };
        conversation.metadata.totalMessages += 1;
        await conversation.save();

        io.to(`conversation_${conversationId}`).emit('new_message', {
          message,
          conversationId
        });

        // Notify both sender and recipient personal rooms for real-time sidebar/badge updates
        const recipientType = socket.userType === 'user' ? 'tutor' : 'user';
        const recipientId = socket.userType === 'user' ? conversation.tutorId : conversation.userId;

        io.to(`${socket.userType}_${socket.userId}`).emit('new_message_notification', {
          conversationId,
          message
        });
        io.to(`${recipientType}_${recipientId}`).emit('new_message_notification', {
          conversationId,
          message
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        userType: socket.userType,
        conversationId
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        userType: socket.userType,
        conversationId
      });
    });

  });
};

// Helper function
function verifyConversationAccess(conversation, userId, userType) {
  if (userType === 'tutor') {
    return conversation.tutorId.toString() === userId.toString();
  } else {
    return conversation.userId.toString() === userId.toString();
  }
}

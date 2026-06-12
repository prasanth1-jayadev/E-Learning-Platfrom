import mongoose from 'mongoose';

const chatNotificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['user', 'tutor'],
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'tutor'],
    required: true
  },
  notificationType: {
    type: String,
    enum: ['new_message', 'new_conversation', 'mention'],
    default: 'new_message'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

chatNotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('ChatNotification', chatNotificationSchema);

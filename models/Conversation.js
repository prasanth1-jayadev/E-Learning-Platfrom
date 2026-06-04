import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual'],
    default: 'individual',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    senderType: String,
    timestamp: Date,
    messageType: String
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    userType: String,
    archivedAt: Date
  }],
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

conversationSchema.index({ tutorId: 1, courseId: 1, type: 1 });
conversationSchema.index({ userId: 1, tutorId: 1, type: 1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

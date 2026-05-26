import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual', 'group'],
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
  // For individual chats
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'individual';
    }
  },
  // For group chats
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  }],
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
    },
    totalParticipants: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Compound indexes for queries
conversationSchema.index({ tutorId: 1, courseId: 1, type: 1 });
conversationSchema.index({ userId: 1, tutorId: 1, type: 1 });
conversationSchema.index({ 'participants.userId': 1 });

// Virtual for participant count
conversationSchema.virtual('participantCount').get(function() {
  return this.type === 'group' ? this.participants.filter(p => p.isActive).length : 2;
});

export default mongoose.model('Conversation', conversationSchema);

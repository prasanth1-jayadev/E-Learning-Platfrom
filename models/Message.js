import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderType: {
    type: String,
    enum: ['user', 'tutor'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Tutor']
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'video'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    }
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.messageType !== 'text';
    }
  },
  fileName: String,
  fileSize: Number,
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    userType: String,
    readAt: Date
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  editedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, senderType: 1 });

export default mongoose.model('Message', messageSchema);

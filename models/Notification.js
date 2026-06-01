import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId:{
        type:mongoose.Schema.ObjectId,
        required:true,
        index:true
    },

recipientType: {
    type: String,
    enum: ['user', 'tutor'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['new_lesson', 'new_course', 'course_purchased'],
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
// Indexing for faster notification queries
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
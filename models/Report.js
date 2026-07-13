import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  reasonType: {
    type: String,
    enum: ['Violated Content', 'Spam', 'Copyright', 'Other'],
    required: true
  },
  customReason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Action Taken'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

export default mongoose.models.Report || mongoose.model('Report', reportSchema);

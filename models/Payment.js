import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'success'
  }
}, {
  timestamps: true
});

export default mongoose.model('Payment', paymentSchema);

import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema({

    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tutor',
        required: true
    },

    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },

    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true
    },

    totalAmount: {
        type: Number,
        required: true
    },

    adminShare: {
        type: Number,
        required: true
    },

    tutorShare: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },

    payoutDate: {
        type: Date,
        default: null
    }

}, { timestamps: true });

export default mongoose.model('Earning', earningSchema);
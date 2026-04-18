const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    phone: { type: String, trim: true },
    subjects: { type: String, trim: true },
    bio: { type: String, trim: true },
    password: { type: String, required: function() { return !this.googleId; } },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false }, 
    approvalStatus: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    isBlocked: { type: Boolean, default: false }, 
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    blockedAt: { type: Date },
    rejectionReason: { type: String },
    googleId: { type: String },
    avatar: { type: String },
    certificatePath: { type: String },
    certificatePublicId: { type: String },
    appliedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

module.exports = mongoose.model('Tutor', tutorSchema);
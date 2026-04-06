const mongoose = require('mongoose');

const pendingTutorSchema = new mongoose.Schema({
    // User who applied
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // Application details
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    
    // Professional documents
    certificatePath: { type: String, required: true }, // File path
    
    // Application status
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    
    // Admin review
    reviewedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' // Admin who reviewed
    },
    reviewedAt: { type: Date },
    rejectionReason: { type: String }, // If rejected
    
    // Timestamps
    appliedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PendingTutor', pendingTutorSchema);

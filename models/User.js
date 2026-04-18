const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String },
    avatar: { type: String },
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockedAt: { type: Date },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
 

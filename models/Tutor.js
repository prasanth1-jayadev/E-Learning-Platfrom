const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    googleId: { type: String },
    avatar: { type: String },
    document: { type: String }, // uploaded file for admin review
    role: { type: String, enum: ['tutor'], default: 'tutor' }
}, { timestamps: true });

module.exports = mongoose.model('Tutor', tutorSchema);
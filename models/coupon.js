import mongoose from "mongoose";


const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  discountType: {
    type: String,
    enum: ["percentage", "flat"],
    required: true
  },

  discountValue: {
    type: Number,
    required: true
  },

  minOrderValue: {
    type: Number,
    default: 0
  },

  maxDiscount: {
    type: Number 
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  expiryDate: {
    type: Date,
    required: true
  },

  usageLimit: {
    type: Number,
    default: 1
  },

  usedCount: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email:{type: String , required:true},
    otp: {type: String , required:true},
    purpose:{type:String, enum:['signup', 'reset', 'email-change'], default:'signup'},
    expiresAt:{type:Date , required:true}
});

export default mongoose.model('OTP', otpSchema);
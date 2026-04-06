const mongoose = require('mongoose');

 const userSchema = new mongoose.Schema({
    fullName  : { type: String, required: true, trim: true },
    email: {type:String , required:true, unique:true ,lowercase:true},
    password: {type:String},
    isVerified: {type:Boolean , default: false},
    googleId: {type:String},
    avatar: {type:String},


role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }

 },{timestamps: true});




 

 module.exports = mongoose.model('User',userSchema);
 

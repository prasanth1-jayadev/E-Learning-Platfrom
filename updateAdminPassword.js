const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// User schema (same as your User model)
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    googleId: { type: String },
    avatar: { type: String },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Update admin password
const updateAdminPassword = async () => {
    try {
        await connectDB();
        
        const adminEmail = 'elearningplatform189@gmail.com';
        const newPassword = '123456';
        
        console.log('🔍 Looking for admin user with email:', adminEmail);
        
        // Find the admin user
        const admin = await User.findOne({ email: adminEmail });
        
        if (!admin) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('✅ Admin user found:', admin.fullName);
        console.log('🔍 Current role:', admin.role);
        
        // Hash the new password
        console.log('🔑 Hashing new password...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('✅ Password hashed:', hashedPassword);
        
        // Update the admin user
        await User.updateOne(
            { email: adminEmail },
            { 
                password: hashedPassword,
                role: 'admin' // Ensure role is set to admin
            }
        );
        
        console.log('✅ Admin password updated successfully!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', newPassword);
        console.log('👤 Role: admin');
        
        // Verify the update
        const updatedAdmin = await User.findOne({ email: adminEmail });
        console.log('🔍 Verification - Role:', updatedAdmin.role);
        console.log('🔍 Verification - Password hash starts with:', updatedAdmin.password.substring(0, 10) + '...');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error updating admin password:', error);
        process.exit(1);
    }
};

updateAdminPassword();
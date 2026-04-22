import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user, done) => {
    const userId = (user._id || user.id).toString();
    done(null, { id: userId, type: user.type });
});

passport.deserializeUser(async (obj, done) => {
    try {
        const Model = obj.type === 'user' ? User : Tutor;
        const user = await Model.findById(obj.id);
        if (user) {
            user.type = obj.type;
        }
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth for Users
passport.use('google-user', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/user/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: profile.emails[0].value }] });
        
        if (user) {
            user.googleId = profile.id;
            user.isVerified = true;
        } else {
            user = new User({
                googleId: profile.id,
                fullName: profile.displayName,
                email: profile.emails[0].value,
                isVerified: true,
                role: 'user'
            });
        }
        
        await user.save();
        user.type = 'user';
        done(null, user);
    } catch (error) {
        console.error('Google OAuth User Error:', error);
        done(error, null);
    }
}));

// Google OAuth for Tutors
passport.use('google-tutor', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/tutor/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let tutor = await Tutor.findOne({ $or: [{ googleId: profile.id }, { email: profile.emails[0].value }] });
        
        if (tutor) {
            tutor.googleId = profile.id;
            tutor.isVerified = true;
        } else {
            tutor = new Tutor({
                googleId: profile.id,
                fullName: profile.displayName,
                email: profile.emails[0].value,
                isVerified: true,
                approvalStatus: 'pending',
                appliedAt: new Date()
            });
        }
        
        await tutor.save();
        tutor.type = 'tutor';
        done(null, tutor);
    } catch (error) {
        console.error('Google OAuth Tutor Error:', error);
        done(error, null);
    }
}));

console.log('Google OAuth configured');

export default passport;
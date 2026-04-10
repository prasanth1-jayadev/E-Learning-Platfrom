const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Tutor = require('../models/Tutor');

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


const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

if (isGoogleConfigured) {
    
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
    
    console.log(' Google OAuth configured successfully');
} else {
    
    passport.use('google-user', {
        authenticate: function(req, options) {
            this.redirect('/user/login?error=google_not_configured');
        }
    });
    
    passport.use('google-tutor', {
        authenticate: function(req, options) {
            this.redirect('/tutor/login?error=google_not_configured');
        }
    });
    
    console.log('⚠️  Google OAuth not configured - add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
}


passport.isGoogleConfigured = isGoogleConfigured;

module.exports = passport;
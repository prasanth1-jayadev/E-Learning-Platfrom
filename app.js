import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import userRouter from './routes/userRouter.js';
import tutorRouter from './routes/tutorRouter.js';
import adminRouter from './routes/adminRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax' 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use('/user', userRouter);
app.use('/tutor', tutorRouter);
app.use('/admin', adminRouter);

app.get('/', (req, res) => res.redirect('/user/landing'));


app.use((req, res) => {
    res.status(404).render('partials/404');
});

const PORT = process.env.PORT || 5000

app.listen(5000, () => {
    console.log(`server is running = http://localhost:${PORT}`);
})

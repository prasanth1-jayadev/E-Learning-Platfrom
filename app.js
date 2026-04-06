const express = require('express');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');
const connectDB = require('./config/db');



dotenv.config();
connectDB();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))




app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'strict'
    }
}));

// Prevent browser from caching protected pages
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});



app.use('/user', require('./routes/userRouter'));
app.use('/tutor', require('./routes/tutorRouter'));
app.use('/admin', require('./routes/adminRouter'));


app.get('/', (req, res) => res.redirect('/user/landing'));


const PORT = process.env.PORT || 5000

app.listen(5000, () => {
    console.log(`server is running = http://localhost:${PORT}`);

})

require('dotenv').config();
const dns          = require('dns');
const express      = require('express');
const session      = require('express-session');
const flash        = require('connect-flash');
const path         = require('path');
const mongoose     = require('mongoose');

// Configure reliable DNS servers for Node.js SRV resolution on Windows (fixes querySrv ETIMEOUT)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('⚠️ Custom DNS setServers failed, using default DNS:', dnsErr.message);
}

const authRoutes     = require('./routes/authRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing from environment variables');
  process.exit(1);
}

// Resilient MongoDB connection with auto-retry
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⏳ Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
}
connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'aparaitech_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000
  }
}));

app.use(flash());

const { formatQuestion } = require('./utils/formatQuestion');
app.locals.formatQuestion = formatQuestion;

app.use((req, res, next) => {
  res.locals.success_msg   = req.flash('success_msg');
  res.locals.error_msg     = req.flash('error_msg');
  res.locals.error         = req.flash('error');
  res.locals.user          = req.session.user || null;
  res.locals.companyName   = process.env.COMPANY_NAME || 'APARAITECH';
  res.locals.formatQuestion = formatQuestion;
  next();
});

app.use('/',        authRoutes);
app.use('/',        workshopRoutes);
app.use('/admin',   adminRoutes);
app.use('/student', studentRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Page Not Found' }));

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 APARAITECH running at http://localhost:${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

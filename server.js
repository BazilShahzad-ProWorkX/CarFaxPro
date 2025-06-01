// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const sanitize = require('mongo-sanitize'); // ✅ Prevent NoSQL injection

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

// ❌ Exit if PayPal credentials or Mongo URI are missing
if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || !MONGO_URI) {
  console.error("❌ Missing required environment variables (PayPal credentials or Mongo URI)");
  process.exit(1);
}

// ✅ PayPal Environment Setup
const environment = new checkoutNodeJssdk.core.LiveEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const payPalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Secure Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
    store: MongoStore.create({ mongoUrl: MONGO_URI })
  })
);

// ✅ MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// ✅ Mongoose Schema
const formSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  companyName: String,
  country: String,
  streetAddress: String,
  apartment: String,
  city: String,
  county: String,
  eircode: String,
  phone: String,
  email: String,
  vin: String,
  note: String,
  vehicleType: String,
  vehiclePrice: String,
  paymentMethod: { type: String, default: 'Mocked' },
  createdAt: { type: Date, default: Date.now },
});
const Submission = mongoose.model('Submission', formSchema);

// ✅ Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/form.html'));
});

// ✅ PayPal Order Creation
app.post('/create-order', async (req, res) => {
  const amount = sanitize(req.body.amount || '20');
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value: amount } }]
  });

  try {
    const order = await payPalClient.execute(request);
    res.status(200).json({ id: order.result.id });
  } catch (err) {
    console.error('❌ PayPal Order Error:', err);
    res.status(500).send('Error creating PayPal order');
  }
});


// ✅ Capture PayPal Order-->
app.post('/capture-order', async (req, res) => {
  const { orderID } = req.body;
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  try {
    const capture = await payPalClient.execute(request);
    console.log("✅ PayPal Capture:", capture.result);

    res.status(200).json({ redirectUrl: '/thank-you.html' });
  } catch (err) {
    console.error('❌ Capture Error:', err);
    res.status(500).json({ redirectUrl: '/error.html' });
  }
});


// ✅ Form Submission
app.post('/submit-form', async (req, res) => {
  try {
    const cleanData = sanitize(req.body);
    const newSubmission = new Submission(cleanData);
    await newSubmission.save();
    res.status(200).json({ message: "Form submitted successfully" });
  } catch (err) {
    console.error('❌ Form submission error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ✅ Auth Middleware
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// ✅ Admin Panel
app.get('/admin', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.status(401).send('Incorrect password');
  }
});

app.get('/admin/data', checkAuth, async (req, res) => {
  const data = await Submission.find().sort({ createdAt: -1 });
  res.json(data);
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});

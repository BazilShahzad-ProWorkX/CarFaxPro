// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk'); // ✅ Correct SDK

const app = express();
const PORT = process.env.PORT || 3000;
// const MONGO_URI = 'mongodb+srv://carfaxuser:CarfaxSecure123@cluster0.t44eyvi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// ✅ PayPal Environment Setup
const environment = new checkoutNodeJssdk.core.SandboxEnvironment(
  'AQN3dMs8QGo5jnmeBSK-qI0GGs0HhkOiQG7n4LmxiuvUIMRcFwsKAYQMeh3ZCrpajFmauW8ho4SRqrTB',
  'EME_IkqAWZK5osr1WEjNROk4Y9M-JFWTyRj10l8cS3msLk3oYhPYl4m1MHX8NbmFpbyEgkVR76D4TaJR'
);
const payPalClient = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session config
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI })
  })
);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});



// Mongoose Schema
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/form.html'));
});

// ✅ PayPal Order Creation Endpoint
app.post('/create-order', async (req, res) => {
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: req.body.amount || '20'
      }
    }]
  });

  try {
    const order = await payPalClient.execute(request);
    res.status(200).json({ id: order.result.id });
  } catch (err) {
    console.error('PayPal Order Error:', err);
    res.status(500).send('Error creating PayPal order');
  }
});

// Form submission
app.post('/submit-form', async (req, res) => {
  try {
    const newSubmission = new Submission(req.body);
    await newSubmission.save();
    res.status(200).json({ message: "Form submitted successfully" });
  } catch (err) {
    console.error('Form submission error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login.html'); //Redirects to your custom login form
  }
}

// Admin login
app.get('/admin',checkAuth,(req, res) => {
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

app.get('/admin/data',checkAuth, async (req, res) => {
  if (!req.session.loggedIn) return res.status(403).send('Unauthorized');
  const data = await Submission.find().sort({ createdAt: -1 });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});


























































// // server.js
// const express = require('express');
// const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
// const path = require('path');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');


// const app = express();
// const PORT = process.env.PORT || 3000;
// const MONGO_URI = 'mongodb+srv://carfaxuser:CarfaxSecure123@cluster0.t44eyvi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// // Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // Session config
// app.use(
//   session({
//     secret: 'carfaxsupersecret',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: MONGO_URI })
//   })
// );

// // Connect to MongoDB
// mongoose.connect(MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const formSchema = new mongoose.Schema({
//   firstName: String,
//   lastName: String,
//   companyName: String,
//   country: String,
//   streetAddress: String,
//   apartment: String,
//   city: String,
//   county: String,
//   eircode: String,
//   phone: String,
//   email: String,
//   vin: String,
//   note: String,
//   vehicleType: String,
//   vehiclePrice: String,
//   paymentMethod: { type: String, default: 'Mocked' },
//   createdAt: { type: Date, default: Date.now },
// });


// const Submission = mongoose.model('Submission', formSchema);

// // Routes
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/index.html'));
// });

// app.get('/form', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public/form.html'));
// });

// app.post('/submit-form', async (req, res) => {
//   try {
//     const newSubmission = new Submission(req.body);
//     await newSubmission.save();

//     // Respond with JSON so frontend can handle redirect
//     res.status(200).json({ message: "Form submitted successfully" });
//   } catch (err) {
//     console.error('Form submission error:', err);
//     res.status(500).json({ message: 'Something went wrong' });
//   }
// });


// // Admin login
// app.get('/admin', (req, res) => {
//   if (req.session.loggedIn) {
//     res.sendFile(path.join(__dirname, 'public/admin.html'));
//   } else {
//     res.sendFile(path.join(__dirname, 'public/login.html'));
//   }
// });

// app.post('/admin/login', (req, res) => {
//   const { password } = req.body;
//   if (password === '123HelloWorldCarFaxpro') {
//     req.session.loggedIn = true;
//     res.redirect('/admin');
//   } else {
//     res.send('Incorrect password');
//   }
// });

// app.get('/admin/data', async (req, res) => {
//   if (!req.session.loggedIn) return res.status(403).send('Unauthorized');
//   const data = await Submission.find().sort({ createdAt: -1 });
//   res.json(data);
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

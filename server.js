const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
// Serve static files (e.g., CSS)
app.use(express.static('public'));
// Connect to MongoDB
mongoose.connect('mongodb+srv://chinomsochristian03:ahYZxLh5loYrfgss@cluster0.dmkcl.mongodb.net/skillup?retryWrites=true&w=majority');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Schemas and Models
const hostelSchema = new mongoose.Schema({
    roomNumber: String,
    roomType: String,
    hostelBuilding: String,
    amount: Number,
    status: { type: String, default: 'Available' },
});

const applicationSchema = new mongoose.Schema({
    studentId: String,
    hostelId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: 'Pending' },
});

const Hostel = mongoose.model('Hostel', hostelSchema);
const Application = mongoose.model('Application', applicationSchema);

// Routes

// Home Route
app.get('/', (req, res) => {
    res.render('login');
});
// Home Route
app.get('/admin', (req, res) => {
    res.render('admin');
});
// Render Register Page
app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/hostels', (req, res) => {
    res.render('hostels');
});

// Admin: Add Hostel
app.post('/admin/add-hostel', async (req, res) => {
    console.log(req.body)
    try {
        const { roomNumber, roomType, hostelBuilding, amount } = req.body;
        const newHostel = new Hostel({ roomNumber, roomType, hostelBuilding, amount });
        await newHostel.save();
        res.json({message: 'Hostel added successfully!'})
    } catch (err) {
        res.status(500).send('Error adding hostel');
    }
});

// Student: View Available Hostels
app.get('/student/hostels', async (req, res) => {
    try {   
        const hostels = await Hostel.find({ status: 'Available' });
        res.json({hostels})
    } catch (err) {
        res.status(500).send('Error retrieving hostels');
    }
});

// Student: Apply for Hostel
app.post('/student/apply', async (req, res) => {
    try {
        const { studentId, hostelId } = req.body;
        const newApplication = new Application({ studentId, hostelId });
        await newApplication.save();
        res.json({message: 'Application submitted successfully!'})
    } catch (err) {
        res.status(500).send('Error submitting application');
    }
});

// Admin: View Applications
app.get('/admin/applications', async (req, res) => {
    try {
        const applications = await Application.find().populate('hostelId');
        res.json({applications})
    } catch (err) {
        res.status(500).send('Error retrieving applications');
    }
});

// Admin: Approve/Reject Application
app.post('/admin/application/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const application = await Application.findById(id);

        if (!application) {
            return res.status(404).send('Application not found');
        }

        application.status = status;
        await application.save();

        if (status === 'Approved') {
            const hostel = await Hostel.findById(application.hostelId);
            hostel.status = 'Occupied';
            await hostel.save();
        }

        res.json({message: 'Application status updated!'})
    } catch (err) {
        res.status(500).send('Error updating application status');
    }
});

// Student: Get Application Status
app.get('/student/application-status', async (req, res) => {
    try {
      const studentId = req.query.studentId;
      if (!studentId || studentId === "undefined") {
        return res.status(400).send('Invalid or missing student ID');
      }
      const application = await Application.findOne({ studentId });
      if (!application) {
        return res.status(404).send('Application not found');
      }
      res.json({ status: application.status });
    } catch (err) {
      res.status(500).send('Error retrieving application status');
    }
  });
  

  
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String, // 'student' or 'admin'
});

const User = mongoose.model('User', userSchema);

// Admin: Register (For Testing Only)
app.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const newUser = new User({ username, password, role });
        await newUser.save();
        res.redirect('/'); // Redirect to login after successful registration
    } catch (err) {
        res.status(500).send('Error registering user');
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });

        if (!user) {
            return res.status(401).send('Invalid username or password');
        }
        res.json({message: 'Login successful'})
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});


// Start Server
const PORT = 3200;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

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
mongoose.connect('mongodb+srv://chinomsochristian03:ahYZxLh5loYrfgss@cluster0.dmkcl.mongodb.net/hostel-allocation?retryWrites=true&w=majority');

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
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    studyHabit: String,
    sleepingHabit: String,
    roommate: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
    status: { type: String, default: 'Pending' },
    matched: { type: Boolean, default: false },
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


// Student: Apply for Hostel
app.post('/student/apply', async (req, res) => {
    try {
        const { studentId, hostelId, studyHabit, sleepingHabit } = req.body;
        const newApplication = new Application({ 
            studentId,
            hostelId,
            studyHabit,
            sleepingHabit,
            status: 'Pending', 
        });
        await newApplication.save();
        res.json({message: 'Application submitted successfully!'})
    } catch (err) {
        res.status(500).send('Error submitting application');
    }
});

// Admin: View Applications
app.get('/admin/applications', async (req, res) => {
    try {
      const applications = await Application.find()
        .populate('hostelId')
        .populate('studentId');
      res.json({ applications });
    } catch (err) {
      res.status(500).send('Error retrieving applications');
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
        return res.json({ message: 'Application not found' });
      }
      return res.json({ status: application.status });
    } catch (err) {
      res.status(500).send('Error retrieving application status');
    }
  });


// Student: View Hostels
app.get('/student/hostels', async (req, res) => {
    try {   
        const hostels = await Hostel.find();
        res.json({hostels})
    } catch (err) {
        res.status(500).send('Error retrieving hostels');
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


app.get('/admin/matched-students', async (req, res) => {
    try {
        // Fetch all approved applications and populate hostel details
        const applications = await Application.find({ status: 'Approved' })
            .populate('hostelId', 'roomNumber hostelBuilding')
            .lean();

        // Group applications by hostel
        const hostels = {};
        applications.forEach((app) => {
            const hostelKey = app.hostelId._id.toString();
            if (!hostels[hostelKey]) {
                hostels[hostelKey] = {
                    hostel: app.hostelId,
                    students: [],
                };
            }
            hostels[hostelKey].students.push({
                studentId: app.studentId,
                studyHabit: app.studyHabit,
                sleepingHabit: app.sleepingHabit,
                roommate: app.roommate || null,
                matched: app.roommate ? true : false, // If roommate exists, mark as matched
            });
        });

        // Convert object to array
        const groupedApplications = Object.values(hostels);

        res.json({ groupedApplications });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching matched students', details: err.message });
    }
});

  
  
  





  





app.post('/admin/match-students', async (req, res) => {
    try {
      // Call the getMatchedStudents function
      const response = await fetch('http://localhost:3200/admin/matched-students');
      const data = await response.json();
      const groupedApplications = data.groupedApplications;
  
      let studentsMatched = false;
  
      // Loop through each hostel and match the students
      for (const hostel of groupedApplications) {
        const students = hostel.students;
  
        // Sort the students by their study and sleeping habits
        students.sort((a, b) => {
          if (a.studyHabit === b.studyHabit) {
            return a.sleepingHabit.localeCompare(b.sleepingHabit);
          } else {
            return a.studyHabit.localeCompare(b.studyHabit);
          }
        });
  
        for (let i = 0; i < students.length; i += 2) {
          if (students[i + 1]) {
            const student1 = students[i];
            const student2 = students[i + 1];
  

try {
    // Update the roommate field for both students
    await Application.findOneAndUpdate({ studentId: student1.studentId }, { roommate: student2.studentId, matched: true });
    await Application.findOneAndUpdate({ studentId: student2.studentId }, { roommate: student1.studentId, matched: true });

    studentsMatched = true;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating student records' });
    return; // Add this line to stop the execution of the code
  }
}
}
}

if (studentsMatched) {
res.json({ message: 'Students matched successfully' });
} else {
res.json({ message: 'No students to match' });
}
} catch (error) {
console.error(error);
res.status(500).json({ error: 'Error matching students' });
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
        role
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
      res.json({ 
        message: 'Login successful', 
        userId: user._id, 
        role: user.role 
      });
    } catch (err) {
      res.status(500).send('Error logging in');
    }
  });
  
    


// Start Server
const PORT = 3300;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

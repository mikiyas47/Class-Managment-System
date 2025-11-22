import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided', status: 'error' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token', status: 'error' });
    }
    req.user = user;
    next();
  });
};

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: __dirname + '/.env' });

// Debug: Log the MONGO_URI to see if it's loaded
console.log("MONGO_URI from .env:", process.env.MONGO_URI);
console.log("__dirname:", __dirname);

const app = express();

// Create HTTP server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:5174", 
      "http://localhost:5175",
      "https://class-managment-system.vercel.app"  // Your Vercel frontend URL
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  }
});

// Store connected students
const connectedStudents = new Map();

// Helper function to calculate student exam score
const calculateStudentExamScore = async (studentExamId) => {
  try {
    // Import models
    const StudentExam = (await import('./StudentExam.js')).default;
    const Answer = (await import('./Answer.js')).default;
    const Question = (await import('./Question.js')).default;
    
    // Get the student exam
    const studentExam = await StudentExam.findById(studentExamId).populate('exam');
    if (!studentExam) {
      throw new Error('Student exam not found');
    }
    
    // Get all answers for this student exam
    const answers = await Answer.find({ studentExam: studentExamId }).populate('question');
    
    if (answers.length === 0) {
      return 0;
    }
    
    // Get all questions for this exam
    const questions = await Question.find({ exam: studentExam.exam._id });
    
    // Calculate score
    let correctAnswers = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q._id.toString() === answer.question._id.toString());
      if (question && answer.selectedOption === question.correctOption) {
        correctAnswers++;
      }
    });
    
    // Calculate percentage score (assuming all questions have equal weight)
    const score = (correctAnswers / questions.length) * 100;
    
    // Update student exam with calculated score
    studentExam.score = score;
    await studentExam.save();
    
    console.log(`Calculated score for student exam ${studentExamId}: ${score}%`);
    return score;
  } catch (error) {
    console.error('Error calculating student exam score:', error);
    throw error;
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle student connection
  socket.on('student-connect', (studentId) => {
    console.log('Student connected:', studentId);
    connectedStudents.set(socket.id, studentId);
    
    // Join a room for this student
    socket.join(`student-${studentId}`);
  });
  
  // Handle teacher connection
  socket.on('teacher-connect', (teacherId) => {
    console.log('Teacher connected:', teacherId);
    socket.join(`teacher-${teacherId}`);
  });
  
  // Handle save answer event
  socket.on('save-answer', async (data) => {
    try {
      console.log('Save answer event received:', data);
      
      const { studentId, examId, questionId, selectedOption } = data;
      
      // Validate required fields
      if (!studentId || !examId || !questionId || !selectedOption) {
        socket.emit('answer-save-error', {
          error: 'Missing required fields: studentId, examId, questionId, and selectedOption are required'
        });
        return;
      }
      
      // Import models
      const StudentExam = (await import('./StudentExam.js')).default;
      const Answer = (await import('./Answer.js')).default;
      const Question = (await import('./Question.js')).default;
      
      // Check if student exam exists
      let studentExam = await StudentExam.findOne({ student: studentId, exam: examId });
      
      // If student exam doesn't exist, create it
      if (!studentExam) {
        studentExam = new StudentExam({
          student: studentId,
          exam: examId,
          startedAt: new Date()
        });
        await studentExam.save();
        console.log('Created new student exam record:', studentExam._id);
      }
      
      // Check if answer already exists
      let answer = await Answer.findOne({ studentExam: studentExam._id, question: questionId });
      
      if (answer) {
        // Update existing answer
        answer.selectedOption = selectedOption;
        await answer.save();
        console.log('Updated existing answer:', answer._id);
      } else {
        // Create new answer
        answer = new Answer({
          studentExam: studentExam._id,
          question: questionId,
          selectedOption
        });
        await answer.save();
        console.log('Created new answer:', answer._id);
      }
      
      // Emit success event
      socket.emit('answer-saved', {
        questionId: questionId,
        answerId: answer._id
      });
      
      console.log('Answer saved successfully');
    } catch (error) {
      console.error('Error saving answer:', error);
      socket.emit('answer-save-error', {
        error: error.message || 'Failed to save answer'
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedStudents.delete(socket.id);
  });
});

// Enable CORS for all routes
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://class-managment-system.vercel.app'  // Your Vercel frontend URL
  ];
  
  const origin = req.headers.origin;
  // Allow requests from any origin for file downloads to support mobile devices
  // But restrict other operations to allowed origins
  if (req.path.includes('/download') || allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Configure multer for assignment file uploads
const assignmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = 'uploads/assignments/';
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/vnd.ms-powerpoint' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype.startsWith('text/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, PowerPoint, Excel, and text files are allowed'), false);
    }
  }
});

// Connect to MongoDB with better error handling
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    
    console.log("Attempting to connect to MongoDB with URI:", process.env.MONGO_URI);
    
    // Add connection options for better debugging
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };
    
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
    
    // Add connection event listeners
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

connectDB();

// Function to create default admin user
const createDefaultAdmin = async () => {
  try {
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Check if admin already exists
    let existingAdmin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    // If admin exists, delete it to ensure we have the correct password
    if (existingAdmin) {
      console.log('ℹ️  Deleting existing admin user to recreate with correct password');
      await Admin.deleteOne({ email: 'mikishemels@gmail.com' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('miki1234', salt);
    
    // Create admin user
    const admin = new Admin({
      name: 'Mikishe Melaku',
      email: 'mikishemels@gmail.com',
      password: hashedPassword
    });
    
    await admin.save();
    console.log('✅ Default admin user created successfully with correct password');
  } catch (error) {
    console.error('❌ Error creating default admin user:', error);
  }
};

// Import routes
import departmentRoutes from './routes/department.routes.js';
import classRoutes from './routes/class.routes.js';
import adminRoutes from './routes/admin.routes.js';
import departmentHeadRoutes from './routes/departmentHead.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import studentRoutes from './routes/student.routes.js';
import courseRoutes from './routes/course.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import examRoutes from './routes/exam.routes.js';
import questionRoutes from './routes/question.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import authRoutes from './routes/auth.routes.js';
import addStudentRoutes from './routes/addStudent.routes.js';
import resultRoutes from './routes/result.routes.js';
import studentExamRoutes from './routes/studentExam.routes.js';
import answerRoutes from './routes/answer.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// Add a test endpoint to check if admin user exists
app.get("/test-admin", async (req, res) => {
  try {
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Check if admin user exists
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (admin) {
      res.json({
        message: 'Admin user found',
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email
        },
        status: 'success'
      });
    } else {
      res.status(404).json({
        message: 'Admin user not found',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
    res.status(500).json({
      message: 'Error checking admin user',
      error: error.message,
      status: 'error'
    });
  }
});

// Add a test login endpoint
app.post("/test-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Test login attempt with:', { email, password });
    
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Check if admin user exists
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(401).json({
        message: 'User not found',
        status: 'error'
      });
    }
    
    console.log('User found in database');
    
    // Check password
    const isMatch = await admin.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid password',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Login successful',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error during test login:', error);
    res.status(500).json({
      message: 'Error during test login',
      error: error.message,
      status: 'error'
    });
  }
});

// Add an endpoint to test admin password
app.get("/test-admin-password", async (req, res) => {
  try {
    console.log('Running admin password test...');
    
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Check if admin user exists
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user with email mikishemels@gmail.com not found');
      return res.status(404).json({
        message: 'Admin user not found',
        status: 'error'
      });
    }
    
    console.log('✅ Admin user found:', {
      id: admin._id,
      name: admin.name,
      email: admin.email
    });
    
    // Test multiple possible passwords
    const testPasswords = ['miki1234', 'miki1234', 'Miki1234', 'mikishemels'];
    let foundMatch = false;
    
    for (const testPassword of testPasswords) {
      const isMatch = await admin.comparePassword(testPassword);
      console.log(`Password test result for "${testPassword}":`, isMatch);
      
      if (isMatch) {
        foundMatch = true;
        console.log(`✅ Password "${testPassword}" matches!`);
        break;
      }
    }
    
    if (!foundMatch) {
      console.log('❌ None of the test passwords matched. The password might be different.');
      return res.status(401).json({
        message: 'None of the test passwords matched',
        status: 'error'
      });
    }
    
    console.log('✅ Password test successful!');
    res.json({
      message: 'Admin password test successful',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      passwordMatch: true,
      status: 'success'
    });
  } catch (error) {
    console.error('❌ Error testing admin password:', error);
    res.status(500).json({
      message: 'Error testing admin password',
      error: error.message,
      status: 'error'
    });
  }
});

// Add an endpoint to recreate the admin user with the correct password
app.post("/recreate-admin", async (req, res) => {
  try {
    console.log('Recreating admin user...');
    
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Delete existing admin user
    const deleted = await Admin.deleteOne({ email: 'mikishemels@gmail.com' });
    console.log('Deleted existing admin user:', deleted.deletedCount);
    
    // Hash password
    const bcrypt = (await import('bcryptjs')).default;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('miki1234', salt);
    console.log('Generated hash for "miki1234":', hashedPassword);
    
    // Create admin user
    const admin = new Admin({
      name: 'Mikishe Melaku',
      email: 'mikishemels@gmail.com',
      password: hashedPassword
    });
    
    console.log('Saving admin user with data:', {
      name: admin.name,
      email: admin.email,
      password: admin.password
    });
    
    await admin.save();
    console.log('✅ Admin user recreated successfully');
    console.log('Saved user data:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      password: admin.password
    });
    
    // Test the password immediately after saving
    const isMatch = await admin.comparePassword('miki1234');
    console.log('Immediate password test after save:', isMatch);
    
    res.json({
      message: 'Admin user recreated successfully',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        passwordTest: isMatch
      },
      status: 'success'
    });
  } catch (error) {
    console.error('❌ Error recreating admin user:', error);
    res.status(500).json({
      message: 'Error recreating admin user',
      error: error.message,
      status: 'error'
    });
  }
});

// Add a GET version for easier browser testing
app.get("/recreate-admin", async (req, res) => {
  try {
    console.log('Recreating admin user via GET request...');
    
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    
    // Delete existing admin user
    const deleted = await Admin.deleteOne({ email: 'mikishemels@gmail.com' });
    console.log('Deleted existing admin user:', deleted.deletedCount);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('miki1234', salt);
    console.log('Generated hash for "miki1234":', hashedPassword);
    
    // Test the hash immediately
    const immediateTest = await bcrypt.compare('miki1234', hashedPassword);
    console.log('Immediate hash test result:', immediateTest);
    
    // Create admin user using findOneAndUpdate to bypass pre-save hooks
    const admin = await Admin.findOneAndUpdate(
      { email: 'mikishemels@gmail.com' },
      {
        name: 'Mikishe Melaku',
        email: 'mikishemels@gmail.com',
        password: hashedPassword
      },
      {
        new: true,
        upsert: true,
        runValidators: false
      }
    );
    
    console.log('Admin user created/updated:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      password: admin.password
    });
    
    // Reload the user from database to ensure we're testing the saved version
    const savedAdmin = await Admin.findById(admin._id);
    console.log('Reloaded user from database:', {
      id: savedAdmin._id,
      name: savedAdmin.name,
      email: savedAdmin.email,
      password: savedAdmin.password
    });
    
    // Test the password on the reloaded user
    const postSaveTest = await savedAdmin.comparePassword('miki1234');
    console.log('Post-save password test result:', postSaveTest);
    
    // Also test with direct bcrypt comparison on reloaded user
    const directTest = await bcrypt.compare('miki1234', savedAdmin.password);
    console.log('Direct bcrypt comparison on saved user:', directTest);
    
    res.json({
      message: 'Admin user recreated successfully via GET request',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        postSaveTest: postSaveTest,
        directTest: directTest,
        generatedHash: hashedPassword,
        savedHash: savedAdmin.password
      },
      status: 'success'
    });
  } catch (error) {
    console.error('❌ Error recreating admin user:', error);
    res.status(500).json({
      message: 'Error recreating admin user',
      error: error.message,
      status: 'error'
    });
  }
});

// Add an endpoint to verify the current admin user
app.get("/verify-admin", async (req, res) => {
  try {
    console.log('Verifying current admin user...');
    
    // Import Admin model
    const Admin = (await import('./Admin.js')).default;
    
    // Check if admin user exists
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user with email mikishemels@gmail.com not found');
      return res.status(404).json({
        message: 'Admin user not found',
        status: 'error'
      });
    }
    
    console.log('✅ Admin user found:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    });
    
    // Test the password with our known correct password
    const testPassword = 'miki1234';
    const isMatch = await admin.comparePassword(testPassword);
    console.log('Password test for "miki1234":', isMatch);
    
    res.json({
      message: 'Admin user verification completed',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      },
      passwordMatch: isMatch,
      status: isMatch ? 'success' : 'error'
    });
  } catch (error) {
    console.error('❌ Error verifying admin user:', error);
    res.status(500).json({
      message: 'Error verifying admin user',
      error: error.message,
      status: 'error'
    });
  }
});

// Use modular routes
app.use('/api/departments', departmentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/department-heads', departmentHeadRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/add-students', addStudentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/student-exams', studentExamRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/schedules', scheduleRoutes);

// Add backward compatibility for login endpoint
app.post('/api/login', (req, res) => {
  // Forward the request to the new auth login endpoint
  res.redirect(307, '/api/auth/login');
});

// Function to check for exams that should become available
const checkExamAvailability = async () => {
  try {
    // Import Exam model
    const Exam = (await import('./Exam.js')).default;
    const now = new Date();
    
    // Find exams that start within the next minute
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    
    const upcomingExams = await Exam.find({
      startTime: { $gte: now, $lte: oneMinuteFromNow }
    }).populate('course', 'subject');
    
    // Notify connected students about upcoming exams
    for (const exam of upcomingExams) {
      console.log(`Notifying about upcoming exam: ${exam.title}`);
      // In a real implementation, you would send notifications to specific students
      // based on their courses/registrations
      io.emit('exam-upcoming', {
        examId: exam._id,
        title: exam.title,
        course: exam.course?.subject,
        startTime: exam.startTime
      });
    }
    
    // Find exams that are currently active
    const activeExams = await Exam.find({
      startTime: { $lte: now },
      $expr: { $gt: [{ $add: ["$startTime", { $multiply: ["$duration", 60000] }] }, now] }
    }).populate('course', 'subject');
    
    // Notify about active exams and send timer updates
    for (const exam of activeExams) {
      console.log(`Notifying about active exam: ${exam.title}`);
      
      // Calculate time left in seconds
      const endTime = new Date(exam.startTime.getTime() + exam.duration * 60000);
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      
      // Send timer update to all connected clients
      io.emit('exam-timer-update', {
        examId: exam._id,
        timeLeft: timeLeft
      });
      
      // If time is up, notify that exam has ended
      if (timeLeft <= 0) {
        io.emit('exam-ended', exam._id);
      }
    }
  } catch (error) {
    console.error('Error checking exam availability:', error);
  }
};

// Run exam availability check every 3 seconds
setInterval(checkExamAvailability, 3000);

// Helper function to get user data from token payload
const getUserFromToken = async (tokenPayload) => {
  try {
    // Import models here to avoid circular dependencies
    const Admin = (await import('./Admin.js')).default;
    const DepartmentHead = (await import('./DepartmentHead.js')).default;
    const Teacher = (await import('./Teacher.js')).default;
    const Student = (await import('./Student.js')).default;
    
    const { id, role } = tokenPayload;
    
    let user = null;
    
    switch (role) {
      case 'admin':
        user = await Admin.findById(id);
        break;
      case 'departmentHead':
        user = await DepartmentHead.findById(id).populate('department');
        break;
      case 'teacher':
        user = await Teacher.findById(id);
        break;
      case 'student':
        user = await Student.findById(id).populate('department').populate('class');
        break;
      default:
        return null;
    }
    
    return user ? user.toJSON() : null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

// Add an endpoint to test bcrypt functionality
app.get("/test-bcrypt", async (req, res) => {
  try {
    console.log('Testing bcrypt functionality...');
    
    // Import bcrypt
    const bcrypt = (await import('bcryptjs')).default;
    
    // Test password
    const password = 'miki1234';
    console.log('Original password:', password);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password:', hashedPassword);
    
    // Test comparison with correct password
    const isMatch1 = await bcrypt.compare(password, hashedPassword);
    console.log('Comparison with correct password:', isMatch1);
    
    // Test comparison with incorrect password
    const isMatch2 = await bcrypt.compare('wrongpassword', hashedPassword);
    console.log('Comparison with incorrect password:', isMatch2);
    
    if (isMatch1 && !isMatch2) {
      console.log('✅ Bcrypt is working correctly!');
      res.json({
        message: 'Bcrypt is working correctly',
        bcryptTest: {
          originalPassword: password,
          hashedPassword: hashedPassword,
          correctPasswordMatch: isMatch1,
          incorrectPasswordMatch: isMatch2
        },
        status: 'success'
      });
    } else {
      console.log('❌ Bcrypt is not working correctly!');
      res.status(500).json({
        message: 'Bcrypt is not working correctly',
        status: 'error'
      });
    }
  } catch (error) {
    console.error('❌ Error testing bcrypt:', error);
    res.status(500).json({
      message: 'Error testing bcrypt',
      error: error.message,
      status: 'error'
    });
  }
});

// Add an enhanced endpoint to test admin password with detailed information
app.get("/test-admin-password-detailed", async (req, res) => {
  try {
    console.log('Running detailed admin password test...');
    
    // Import Admin model and bcrypt
    const Admin = (await import('./Admin.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    
    // Check if admin user exists
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user with email mikishemels@gmail.com not found');
      return res.status(404).json({
        message: 'Admin user not found',
        status: 'error'
      });
    }
    
    console.log('✅ Admin user found:', {
      id: admin._id,
      name: admin.name,
      email: admin.email
    });
    console.log('Stored password hash:', admin.password);
    
    // Test password
    const testPassword = 'miki1234';
    console.log('Testing password:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('Direct bcrypt comparison result:', isMatch);
    
    // Also test using the model's method
    const isMatch2 = await admin.comparePassword(testPassword);
    console.log('Model method comparison result:', isMatch2);
    
    // Test with different variations
    const testPasswords = ['miki1234', 'Miki1234', 'mikishemels', ''];
    const results = {};
    
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, admin.password);
      results[pwd] = match;
      console.log(`Password "${pwd}" comparison result:`, match);
    }
    
    const response = {
      message: 'Admin password test completed',
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      storedHash: admin.password,
      directComparison: isMatch,
      modelMethodComparison: isMatch2,
      passwordVariationsTest: results,
      status: isMatch ? 'success' : 'error'
    };
    
    if (!isMatch) {
      console.log('❌ Password does not match. The stored hash might be corrupted.');
      
      // Let's try to recreate the hash
      console.log('Testing hash recreation...');
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(testPassword, salt);
      console.log('New hash:', newHash);
      
      const isNewMatch = await bcrypt.compare(testPassword, newHash);
      console.log('New hash comparison result:', isNewMatch);
      
      response.newHashTest = {
        newHash: newHash,
        newHashComparison: isNewMatch
      };
    } else {
      console.log('✅ Password matches!');
    }
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error testing admin password:', error);
    res.status(500).json({
      message: 'Error testing admin password',
      error: error.message,
      status: 'error'
    });
  }
});

// Create default admin user and then start server
createDefaultAdmin().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

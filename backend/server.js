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
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"]
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
    'http://localhost:5175'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

app.get("/", (req, res) => {
  res.send("Backend is running...");
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
    
    // Notify about active exams
    for (const exam of activeExams) {
      console.log(`Notifying about active exam: ${exam.title}`);
      io.emit('exam-active', {
        examId: exam._id,
        title: exam.title,
        course: exam.course?.subject,
        startTime: exam.startTime,
        duration: exam.duration
      });
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

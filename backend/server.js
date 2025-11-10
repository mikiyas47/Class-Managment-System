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
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected clients
const connectedClients = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle student connection
  socket.on('student-connect', (studentId) => {
    console.log('Student connected:', studentId);
    connectedClients.set(studentId, socket.id);
  });

  // Handle teacher connection
  socket.on('teacher-connect', (teacherId) => {
    console.log('Teacher connected:', teacherId);
    connectedClients.set(teacherId, socket.id);
  });

  // Handle answer saving
  socket.on('save-answer', async (data) => {
    try {
      console.log('Saving answer:', data);
      
      // Import Answer model
      const Answer = (await import('./Answer.js')).default;
      
      // Save or update the answer
      const existingAnswer = await Answer.findOne({
        student: data.studentId,
        exam: data.examId,
        question: data.questionId
      });
      
      if (existingAnswer) {
        existingAnswer.selectedOption = data.selectedOption;
        await existingAnswer.save();
      } else {
        const answer = new Answer({
          student: data.studentId,
          exam: data.examId,
          question: data.questionId,
          selectedOption: data.selectedOption
        });
        await answer.save();
      }
      
      // Emit confirmation back to the student
      socket.emit('answer-saved', {
        questionId: data.questionId,
        message: 'Answer saved successfully'
      });
    } catch (error) {
      console.error('Error saving answer:', error);
      socket.emit('answer-save-error', {
        questionId: data.questionId,
        error: error.message
      });
    }
  });

  // Handle exam timer updates
  socket.on('exam-timer-update', (data) => {
    // Broadcast to all clients in the exam room
    socket.broadcast.emit('exam-timer-update', data);
  });

  // Handle exam ended notification
  socket.on('exam-ended', (examId) => {
    // Broadcast to all clients that the exam has ended
    socket.broadcast.emit('exam-ended', examId);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove client from connected clients map
    for (let [key, value] of connectedClients.entries()) {
      if (value === socket.id) {
        connectedClients.delete(key);
        break;
      }
    }
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

// Add backward compatibility for login endpoint
app.post('/api/login', (req, res) => {
  // Forward the request to the new auth login endpoint
  res.redirect(307, '/api/auth/login');
});

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
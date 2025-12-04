import express from 'express';
import Assignment from '../Assignment.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all assignments (with teacher filtering for teachers)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    let query = {};
    
    // If user is a teacher, only show assignments created by that teacher
    if (user && user.userType === 'teacher' && user.teacherId) {
      query = { teacher: user.teacherId };
    }
    
    const assignments = await Assignment.find(query).populate('class').populate('teacher').sort({ createdAt: -1 });
    
    res.json({
      message: 'Assignments retrieved successfully',
      data: assignments,
      count: assignments.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      message: 'Error retrieving assignments',
      error: error.message,
      status: 'error'
    });
  }
});

// Get assignment by ID (with teacher filtering for teachers)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    const assignment = await Assignment.findById(id).populate('class').populate('teacher');
    
    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found',
        status: 'error'
      });
    }
    
    // If user is a teacher, check if they have access to this assignment
    if (user && user.userType === 'teacher' && user.teacherId) {
      // Check if assignment has a teacher and the teacher has an _id before comparing
      if (assignment.teacher && assignment.teacher._id && assignment.teacher._id.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only view assignments you created.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Assignment retrieved successfully',
      data: assignment,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      message: 'Error retrieving assignment',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new assignment
router.post('/', authenticateToken, assignmentUpload.single('file'), async (req, res) => {
  try {
    const { class: classId, teacher, filename } = req.body;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    // If user is a teacher, they can only create assignments for themselves
    if (user && user.userType === 'teacher' && user.teacherId) {
      if (teacher !== user.teacherId) {
        // Clean up uploaded file if validation fails
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(403).json({
          message: 'Access denied. You can only create assignments for yourself.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!classId || !teacher || !filename || !req.file) {
      // Clean up uploaded file if validation fails
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        message: 'Class, teacher, filename, and file are required',
        status: 'error'
      });
    }
    
    // Create new assignment
    const assignment = new Assignment({
      class: classId,
      teacher,
      filename,
      path: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
    
    await assignment.save();
    
    // Populate the response with referenced data
    const savedAssignment = await Assignment.findById(assignment._id)
      .populate('class', 'year semester')
      .populate('teacher', 'name email');
    
    res.status(201).json({
      message: 'Assignment created successfully',
      data: savedAssignment,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    
    // Clean up uploaded file if save fails
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: 'Error creating assignment',
      error: error.message,
      status: 'error'
    });
  }
});

// Update assignment by ID
router.put('/:id', authenticateToken, assignmentUpload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { class: classId, teacher, filename } = req.body;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    // If user is a teacher, check if they have access to this assignment
    if (user && user.userType === 'teacher' && user.teacherId) {
      const assignment = await Assignment.findById(id);
      if (assignment && assignment.teacher.toString() !== user.teacherId) {
        // Clean up uploaded file if validation fails
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(403).json({
          message: 'Access denied. You can only update assignments you created.',
          status: 'error'
        });
      }
      
      // Teachers can't change the teacher of an assignment
      if (teacher !== user.teacherId) {
        // Clean up uploaded file if validation fails
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(403).json({
          message: 'Access denied. You can only update assignments you created.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields (file is optional for updates)
    if (!classId || !teacher || !filename) {
      // Clean up uploaded file if validation fails
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        message: 'Class, teacher, and filename are required',
        status: 'error'
      });
    }
    
    // Find existing assignment
    const existingAssignment = await Assignment.findById(id);
    if (!existingAssignment) {
      // Clean up uploaded file if assignment not found
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(404).json({
        message: 'Assignment not found',
        status: 'error'
      });
    }
    
    // Prepare update data
    const updateData = {
      class: classId,
      teacher,
      filename
    };
    
    // If a new file was uploaded, update file metadata and clean up old file
    if (req.file) {
      // Delete old file if it exists
      if (existingAssignment.path && fs.existsSync(existingAssignment.path)) {
        fs.unlinkSync(existingAssignment.path);
      }
      
      updateData.path = req.file.path;
      updateData.originalName = req.file.originalname;
      updateData.mimeType = req.file.mimetype;
      updateData.size = req.file.size;
    }
    
    const assignment = await Assignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('class', 'year semester').populate('teacher', 'name email');
    
    res.json({
      message: 'Assignment updated successfully',
      data: assignment,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    
    // Clean up uploaded file if update fails
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: 'Error updating assignment',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete assignment by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    // If user is a teacher, check if they have access to this assignment
    if (user && user.userType === 'teacher' && user.teacherId) {
      const assignment = await Assignment.findById(id);
      if (assignment && assignment.teacher.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only delete assignments you created.',
          status: 'error'
        });
      }
    }
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found',
        status: 'error'
      });
    }
    
    // Delete the file from disk if it exists
    if (assignment.path && fs.existsSync(assignment.path)) {
      fs.unlinkSync(assignment.path);
    }
    
    // Delete the assignment from database
    await Assignment.findByIdAndDelete(id);
    
    res.json({
      message: 'Assignment deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      message: 'Error deleting assignment',
      error: error.message,
      status: 'error'
    });
  }
});

// Download assignment file
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found',
        status: 'error'
      });
    }
    
    // If user is a teacher, check if they have access to this assignment
    // If user is a student, allow download (students can download all assignments)
    if (user && user.userType === 'teacher' && user.teacherId) {
      // Check if assignment has a teacher and the teacher has an _id before comparing
      if (assignment.teacher && assignment.teacher._id && assignment.teacher._id.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only download assignments you created.',
          status: 'error'
        });
      }
    }
    
    if (!assignment.path || !fs.existsSync(assignment.path)) {
      return res.status(404).json({
        message: 'File not found',
        status: 'error'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.originalName}"`);
    res.setHeader('Content-Type', assignment.mimeType);
    
    // Send the file
    res.sendFile(path.resolve(assignment.path));
  } catch (error) {
    console.error('Error downloading assignment:', error);
    res.status(500).json({
      message: 'Error downloading assignment',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
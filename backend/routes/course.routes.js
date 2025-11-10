import express from 'express';
import Course from '../Course.js';
import Class from '../Class.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all courses (with department filtering for department heads)
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
    
    // If user is a department head, only show courses from their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      // Find classes in the department head's department
      const classes = await Class.find({ department: user.departmentId });
      const classIds = classes.map(cls => cls._id);
      
      query = { class: { $in: classIds } };
    }
    
    const courses = await Course.find(query).populate('department').populate('class').populate('teacher').sort({ createdAt: -1 });
    
    res.json({
      message: 'Courses retrieved successfully',
      data: courses,
      count: courses.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      message: 'Error retrieving courses',
      error: error.message,
      status: 'error'
    });
  }
});

// Get course by ID (with department filtering for department heads)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).populate('department').populate('class').populate('teacher');
    
    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Course retrieved successfully',
      data: course,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      message: 'Error retrieving course',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new course
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { department, class: classId, teacher, subject, code, crh } = req.body;
    
    // Validate required fields
    if (!department || !classId || !teacher || !subject || crh === undefined || crh === null) {
      return res.status(400).json({
        message: 'Department, class, teacher, subject, and credit hours are required',
        status: 'error'
      });
    }
    
    // Validate crh is a number and >= 0
    if (isNaN(crh) || crh < 0) {
      return res.status(400).json({
        message: 'Credit hours must be a number greater than or equal to 0',
        status: 'error'
      });
    }
    
    // Check if course with this class, teacher, and subject already exists
    const existingCourse = await Course.findOne({ class: classId, teacher, subject });
    
    if (existingCourse) {
      return res.status(400).json({
        message: 'A course with this class, teacher, and subject already exists',
        status: 'error'
      });
    }
    
    // Create new course
    const course = new Course({
      department,
      class: classId,
      teacher,
      subject,
      code,
      crh
    });
    
    await course.save();
    
    // Populate the response with referenced data
    const savedCourse = await Course.findById(course._id).populate('department').populate('class').populate('teacher');
    
    res.status(201).json({
      message: 'Course created successfully',
      data: savedCourse,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating course:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A course with this class, teacher, and subject already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating course',
      error: error.message,
      status: 'error'
    });
  }
});

// Update course by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { department, class: classId, teacher, subject, code, crh } = req.body;
    
    // Validate required fields
    if (!department || !classId || !teacher || !subject || crh === undefined || crh === null) {
      return res.status(400).json({
        message: 'Department, class, teacher, subject, and credit hours are required',
        status: 'error'
      });
    }
    
    // Validate crh is a number and >= 0
    if (isNaN(crh) || crh < 0) {
      return res.status(400).json({
        message: 'Credit hours must be a number greater than or equal to 0',
        status: 'error'
      });
    }
    
    // Check if another course with this class, teacher, and subject already exists
    const existingCourse = await Course.findOne({
      class: classId,
      teacher,
      subject,
      _id: { $ne: id }
    });
    
    if (existingCourse) {
      return res.status(400).json({
        message: 'A course with this class, teacher, and subject already exists',
        status: 'error'
      });
    }
    
    const course = await Course.findByIdAndUpdate(
      id,
      { department, class: classId, teacher, subject, code, crh },
      { new: true, runValidators: true }
    ).populate('department').populate('class').populate('teacher');
    
    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Course updated successfully',
      data: course,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating course:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A course with this class, teacher, and subject already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating course',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete course by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);
    
    if (!course) {
      return res.status(404).json({
        message: 'Course not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Course deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      message: 'Error deleting course',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
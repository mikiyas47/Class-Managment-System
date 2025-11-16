import express from 'express';
import Class from '../Class.js';
import Department from '../Department.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all classes (with department filtering for department heads)
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
    
    // If user is a department head, only show classes from their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      query = { department: user.departmentId };
    }
    
    const classes = await Class.find(query).populate('department').sort({ createdAt: -1 });
    
    res.json({
      message: 'Classes retrieved successfully',
      data: classes,
      count: classes.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      message: 'Error retrieving classes',
      error: error.message,
      status: 'error'
    });
  }
});

// Get class by ID (with department filtering for department heads)
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
    
    const classItem = await Class.findById(id).populate('department');
    
    if (!classItem) {
      return res.status(404).json({
        message: 'Class not found',
        status: 'error'
      });
    }
    
    // If user is a department head, check if they have access to this class
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (classItem.department._id.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only view classes from your department.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Class retrieved successfully',
      data: classItem,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      message: 'Error retrieving class',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new class
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { department, year, semester } = req.body;
    
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
    
    // If user is a department head, they can only create classes for their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (department !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only create classes for your department.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!department || !year || !semester) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate year range
    if (year < 1 || year > 7) {
      return res.status(400).json({
        message: 'Year must be between 1 and 7',
        status: 'error'
      });
    }
    
    // Validate semester
    if (!['first', 'second'].includes(semester)) {
      return res.status(400).json({
        message: 'Semester must be either "first" or "second"',
        status: 'error'
      });
    }
    
    // Check if class with this department, year, and semester already exists
    const existingClass = await Class.findOne({ department, year, semester });
    
    if (existingClass) {
      return res.status(400).json({
        message: 'A class with this department, year, and semester already exists',
        status: 'error'
      });
    }
    
    // Create new class
    const classItem = new Class({
      department,
      year: parseInt(year),
      semester
    });
    
    await classItem.save();
    
    // Populate the response with referenced data
    const savedClass = await Class.findById(classItem._id).populate('department');
    
    res.status(201).json({
      message: 'Class created successfully',
      data: savedClass,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating class:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A class with this department, year, and semester already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating class',
      error: error.message,
      status: 'error'
    });
  }
});

// Update class by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { department, year, semester } = req.body;
    
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
    
    // If user is a department head, check if they have access to this class
    if (user && user.userType === 'department-head' && user.departmentId) {
      const classItem = await Class.findById(id);
      if (classItem && classItem.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only update classes from your department.',
          status: 'error'
        });
      }
      
      // Department heads can't change the department of a class
      if (department !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only update classes within your department.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!department || !year || !semester) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate year range
    if (year < 1 || year > 7) {
      return res.status(400).json({
        message: 'Year must be between 1 and 7',
        status: 'error'
      });
    }
    
    // Validate semester
    if (!['first', 'second'].includes(semester)) {
      return res.status(400).json({
        message: 'Semester must be either "first" or "second"',
        status: 'error'
      });
    }
    
    // Check if another class with this department, year, and semester already exists
    const existingClass = await Class.findOne({
      department,
      year,
      semester,
      _id: { $ne: id }
    });
    
    if (existingClass) {
      return res.status(400).json({
        message: 'A class with this department, year, and semester already exists',
        status: 'error'
      });
    }
    
    const classItem = await Class.findByIdAndUpdate(
      id,
      {
        department,
        year: parseInt(year),
        semester
      },
      { new: true, runValidators: true }
    ).populate('department');
    
    if (!classItem) {
      return res.status(404).json({
        message: 'Class not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Class updated successfully',
      data: classItem,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating class:', error);
    
    res.status(500).json({
      message: 'Error updating class',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete class by ID
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
    
    // If user is a department head, check if they have access to this class
    if (user && user.userType === 'department-head' && user.departmentId) {
      const classItem = await Class.findById(id);
      if (classItem && classItem.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only delete classes from your department.',
          status: 'error'
        });
      }
    }
    
    const classItem = await Class.findByIdAndDelete(id);
    
    if (!classItem) {
      return res.status(404).json({
        message: 'Class not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Class deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      message: 'Error deleting class',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
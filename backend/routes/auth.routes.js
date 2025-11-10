import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../Admin.js';
import DepartmentHead from '../DepartmentHead.js';
import Teacher from '../Teacher.js';
import Student from '../Student.js';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Unified login endpoint that identifies user type and redirects accordingly
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Try to find the user in each collection
    let user = null;
    let userType = null;
    
    // Check if it's an admin
    user = await Admin.findOne({ email });
    if (user) {
      const isMatch = await user.comparePassword(password);
      if (isMatch) {
        userType = 'admin';
      } else {
        user = null; // Invalid password
      }
    }
    
    // Check if it's a department head
    if (!user) {
      user = await DepartmentHead.findOne({ email }).populate('department');
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          userType = 'department-head';
        } else {
          user = null; // Invalid password
        }
      }
    }
    
    // Check if it's a teacher
    if (!user) {
      user = await Teacher.findOne({ email });
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          userType = 'teacher';
        } else {
          user = null; // Invalid password
        }
      }
    }
    
    // Check if it's a student
    if (!user) {
      user = await Student.findOne({ email }).populate('department').populate('class');
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          userType = 'student';
        } else {
          user = null; // Invalid password
        }
      }
    }
    
    // If no user found or invalid password
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
        status: 'error'
      });
    }
    
    // Generate JWT token with user-specific information
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        userType,
        // Include additional user-specific data
        ...(userType === 'department-head' && { departmentId: user.department?._id }),
        ...(userType === 'teacher' && { teacherId: user._id })
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Return user data and token in the expected format
    res.json({
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          email: user.email,
          name: user.name || user.username,
          userType,
          // Include department info for department heads
          ...(userType === 'department-head' && { 
            department: user.department 
          }),
          // Include class info for students
          ...(userType === 'student' && { 
            class: user.class,
            department: user.department
          }),
          // Include other relevant user data
          ...(userType === 'teacher' && { 
            userId: user.userId,
            phoneNumber: user.phoneNumber
          })
        },
        userType,
        token
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      error: error.message,
      status: 'error'
    });
  }
});

// Token verification endpoint
router.get('/verify-token', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided', status: 'error' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token', status: 'error' });
      }
      
      res.json({
        message: 'Token is valid',
        user,
        status: 'success'
      });
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Error verifying token',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
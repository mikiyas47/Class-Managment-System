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
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    // Try to find the user in each collection
    let user = null;
    let userType = null;
    
    // Check if it's an admin
    console.log('Checking for admin user...');
    user = await Admin.findOne({ email });
    console.log('Admin search result:', user ? 'User found' : 'User not found');
    
    if (user) {
      console.log('Admin user found, checking password...');
      console.log('Stored hash:', user.password);
      console.log('Provided password:', password);
      
      const isMatch = await user.comparePassword(password);
      console.log('Admin password match result:', isMatch);
      
      if (isMatch) {
        userType = 'admin';
        console.log('Admin authentication successful');
      } else {
        user = null; // Invalid password
        console.log('Admin password mismatch');
      }
    }
    
    // Check if it's a department head
    if (!user) {
      console.log('Checking for department head user...');
      user = await DepartmentHead.findOne({ email }).populate('department');
      console.log('Department head search result:', user ? 'User found' : 'User not found');
      
      if (user) {
        const isMatch = await user.comparePassword(password);
        console.log('Department head password match result:', isMatch);
        
        if (isMatch) {
          userType = 'department-head';
          console.log('Department head authentication successful');
        } else {
          user = null; // Invalid password
          console.log('Department head password mismatch');
        }
      }
    }
    
    // Check if it's a teacher
    if (!user) {
      console.log('Checking for teacher user...');
      user = await Teacher.findOne({ email });
      console.log('Teacher search result:', user ? 'User found' : 'User not found');
      
      if (user) {
        const isMatch = await user.comparePassword(password);
        console.log('Teacher password match result:', isMatch);
        
        if (isMatch) {
          userType = 'teacher';
          console.log('Teacher authentication successful');
        } else {
          user = null; // Invalid password
          console.log('Teacher password mismatch');
        }
      }
    }
    
    // Check if it's a student
    if (!user) {
      console.log('Checking for student user...');
      user = await Student.findOne({ email }).populate('department').populate('class');
      console.log('Student search result:', user ? 'User found' : 'User not found');
      
      if (user) {
        const isMatch = await user.comparePassword(password);
        console.log('Student password match result:', isMatch);
        
        if (isMatch) {
          userType = 'student';
          console.log('Student authentication successful');
        } else {
          user = null; // Invalid password
          console.log('Student password mismatch');
        }
      }
    }
    
    // If no user found or invalid password
    if (!user) {
      console.log('Login failed: Invalid email or password for email:', email);
      return res.status(401).json({
        message: 'Invalid email or password',
        status: 'error'
      });
    }
    
    console.log('Login successful for user:', user.email, 'Type:', userType);
    
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
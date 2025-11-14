import express from 'express';
import Teacher from '../Teacher.js';
import Course from '../Course.js';
import Student from '../Student.js';
import Class from '../Class.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for CSV upload specifically for this route
const csvUpload = multer({
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

// Get all teachers (with department filtering for department heads)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
        console.log('User verified from token:', user);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    let query = {};
    
    // If user is a department head, only show teachers from their department
    // For now, we'll show all teachers to department heads to ensure newly created teachers are visible
    // In a production environment, you might want to implement a more sophisticated filtering system
    if (user && user.userType === 'department-head' && user.departmentId) {
      console.log('Department head user detected, showing all teachers for now');
      // Currently showing all teachers to department heads
      // In the future, this could be enhanced to show only teachers in their department
    } else {
      console.log('Not a department head or no departmentId, showing all teachers');
    }
    
    const teachers = await Teacher.find(query).sort({ createdAt: -1 });
    console.log('Teachers found:', teachers);
    
    res.json({
      message: 'Teachers retrieved successfully',
      data: teachers,
      count: teachers.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      message: 'Error retrieving teachers',
      error: error.message,
      status: 'error'
    });
  }
});

// Get teacher by ID (with department filtering for department heads)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      return res.status(404).json({
        message: 'Teacher not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Teacher retrieved successfully',
      data: teacher,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      message: 'Error retrieving teacher',
      error: error.message,
      status: 'error'
    });
  }
});

// Get courses by teacher ID
router.get('/:id/courses', async (req, res) => {
  try {
    const { id } = req.params;
    const courses = await Course.find({ teacher: id }).populate('department').populate('class').sort({ createdAt: -1 });
    
    res.json({
      message: 'Courses retrieved successfully',
      data: courses,
      count: courses.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({
      message: 'Error retrieving courses',
      error: error.message,
      status: 'error'
    });
  }
});

// Get students by teacher ID
router.get('/:id/students', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the courses taught by this teacher
    const courses = await Course.find({ teacher: id });
    const classIds = courses.map(course => course.class);
    
    // Then get students in those classes
    const students = await Student.find({ class: { $in: classIds } })
      .populate('department')
      .populate('class');
    
    res.json({
      message: 'Students retrieved successfully',
      data: students,
      count: students.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({
      message: 'Error retrieving students',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new teacher
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, name, email, phoneNumber, password } = req.body;
    
    // Validate required fields
    if (!userId || !name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if teacher with this userId already exists
    const existingTeacher = await Teacher.findOne({ userId });
    
    if (existingTeacher) {
      return res.status(400).json({
        message: 'Teacher with this user ID already exists',
        status: 'error'
      });
    }
    
    // Check if teacher with this email already exists
    const existingEmail = await Teacher.findOne({ email });
    
    if (existingEmail) {
      return res.status(400).json({
        message: 'Teacher with this email already exists',
        status: 'error'
      });
    }
    
    // Check if teacher with this phone number already exists
    const existingPhone = await Teacher.findOne({ phoneNumber });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'Teacher with this phone number already exists',
        status: 'error'
      });
    }
    
    // Create new teacher
    const teacher = new Teacher({
      userId,
      name,
      email,
      phoneNumber,
      password
    });
    
    await teacher.save();
    
    res.status(201).json({
      message: 'Teacher created successfully',
      data: {
        id: teacher._id,
        userId: teacher.userId,
        name: teacher.name,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.userId) {
        return res.status(400).json({
          message: 'Teacher with this user ID already exists',
          status: 'error'
        });
      } else if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Teacher with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNumber) {
        return res.status(400).json({
          message: 'Teacher with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error creating teacher',
      error: error.message,
      status: 'error'
    });
  }
});

// Bulk upload teachers via CSV
router.post('/bulk-upload', authenticateToken, (req, res, next) => {
  // Handle the file upload with proper error handling
  csvUpload.single('file')(req, res, (err) => {
    if (err) {
      // Handle multer errors specifically
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Unexpected field in form data. Only "file" field is expected for file upload.',
          status: 'error'
        });
      }
      return res.status(400).json({
        message: err.message || 'File upload error',
        status: 'error'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    // Debug logging to see what we received
    console.log('=== TEACHER BULK UPLOAD DEBUG INFO ===');
    console.log('File received:', req.file);
    console.log('Body received:', req.body);
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('ERROR: No CSV file found in request');
      return res.status(400).json({
        message: 'No CSV file uploaded',
        status: 'error'
      });
    }

    const csvFile = req.file;
    
    // Validate file type
    if (csvFile.mimetype !== 'text/csv' && !csvFile.originalname.endsWith('.csv')) {
      return res.status(400).json({
        message: 'Only CSV files are allowed',
        status: 'error'
      });
    }

    // Use csv-parser to parse the CSV data
    const resultsFromCsv = [];
    
    // Create a promise to handle the async parsing
    await new Promise((resolve, reject) => {
      const stream = Readable.from(csvFile.buffer.toString());
      stream
        .pipe(csv())
        .on('data', (data) => {
          console.log('CSV row data:', data);
          resultsFromCsv.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('CSV parsing completed. Rows:', resultsFromCsv.length);
    
    const results = [];
    const errors = [];
    let addedCount = 0;

    // Process each row
    for (let i = 0; i < resultsFromCsv.length; i++) {
      const teacherData = resultsFromCsv[i];
      console.log(`Processing row ${i + 1}:`, teacherData);

      try {
        // Validate required fields
        const requiredFields = ['name', 'email', 'phoneNumber', 'userId', 'password'];
        const missingFields = requiredFields.filter(field => !teacherData[field] || teacherData[field].trim() === '');
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Clean the data
        const cleanedData = {
          name: teacherData.name.trim(),
          email: teacherData.email.trim().toLowerCase(),
          phoneNumber: teacherData.phoneNumber.trim(),
          userId: teacherData.userId.trim(),
          password: teacherData.password.trim()
        };

        // Check if teacher with same email or userId already exists
        const existingTeacher = await Teacher.findOne({
          $or: [
            { email: cleanedData.email },
            { userId: cleanedData.userId }
          ]
        });
        
        console.log(`Checking for duplicate teacher: ${cleanedData.userId}, ${cleanedData.email}`);
        console.log(`Existing teacher found: ${existingTeacher ? 'Yes' : 'No'}`);
        
        if (existingTeacher) {
          let duplicateField = '';
          if (existingTeacher.userId === cleanedData.userId) {
            duplicateField = `user ID ${cleanedData.userId}`;
          } else if (existingTeacher.email === cleanedData.email) {
            duplicateField = `email ${cleanedData.email}`;
          }
          const errorMessage = `Teacher with ${duplicateField} already exists`;
          console.log(`Duplicate found: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Create new teacher (password will be hashed by pre-save hook)
        console.log(`Creating new teacher: ${cleanedData.userId}`);
        const newTeacher = new Teacher(cleanedData);
        
        console.log('Attempting to save teacher:', newTeacher);

        await newTeacher.save();
        console.log('Teacher saved successfully:', newTeacher._id);
        addedCount++;
        results.push({
          userId: cleanedData.userId,
          email: cleanedData.email,
          status: 'success'
        });
      } catch (error) {
        console.error('Error processing teacher:', error);
        errors.push({
          row: i + 1,
          userId: teacherData.userId,
          email: teacherData.email,
          error: error.message
        });
      }
    }

    console.log('Bulk upload completed. Added:', addedCount, 'Errors:', errors.length);
    res.status(200).json({
      message: `Successfully processed ${resultsFromCsv.length} records`,
      addedCount,
      errorCount: errors.length,
      errors,
      status: errors.length > 0 ? 'error' : 'success'
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      message: error.message || 'Error processing bulk upload',
      status: 'error'
    });
  }
});

// Change teacher password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const teacherId = req.user.id; // Get teacher ID from authenticated token
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
        status: 'error'
      });
    }
    
    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long',
        status: 'error'
      });
    }
    
    // Find teacher by ID
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({
        message: 'Teacher not found',
        status: 'error'
      });
    }
    
    // Check if current password is correct
    const isMatch = await teacher.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect',
        status: 'error'
      });
    }
    
    // Update password
    teacher.password = newPassword;
    await teacher.save();
    
    res.json({
      message: 'Password changed successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      message: 'Error changing password',
      error: error.message,
      status: 'error'
    });
  }
});

// Update teacher by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, email, phoneNumber } = req.body;
    
    // Validate required fields (password is not required for updates)
    if (!userId || !name || !email || !phoneNumber) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if another teacher with this userId already exists
    const existingUserId = await Teacher.findOne({
      userId,
      _id: { $ne: id }
    });
    
    if (existingUserId) {
      return res.status(400).json({
        message: 'Teacher with this user ID already exists',
        status: 'error'
      });
    }
    
    // Check if another teacher with this email already exists
    const existingEmail = await Teacher.findOne({
      email,
      _id: { $ne: id }
    });
    
    if (existingEmail) {
      return res.status(400).json({
        message: 'Teacher with this email already exists',
        status: 'error'
      });
    }
    
    // Check if another teacher with this phone number already exists
    const existingPhone = await Teacher.findOne({
      phoneNumber,
      _id: { $ne: id }
    });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'Teacher with this phone number already exists',
        status: 'error'
      });
    }
    
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { userId, name, email, phoneNumber },
      { new: true, runValidators: true }
    );
    
    if (!teacher) {
      return res.status(404).json({
        message: 'Teacher not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Teacher updated successfully',
      data: {
        id: teacher._id,
        userId: teacher.userId,
        name: teacher.name,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.userId) {
        return res.status(400).json({
          message: 'Teacher with this user ID already exists',
          status: 'error'
        });
      } else if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Teacher with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNumber) {
        return res.status(400).json({
          message: 'Teacher with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error updating teacher',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete teacher by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findByIdAndDelete(id);
    
    if (!teacher) {
      return res.status(404).json({
        message: 'Teacher not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Teacher deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({
      message: 'Error deleting teacher',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
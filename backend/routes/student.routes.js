import express from 'express';
import Student from '../Student.js';
import Class from '../Class.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Dynamically import user models to avoid circular dependencies
let Admin, DepartmentHead, Teacher;

const initializeModels = async () => {
  if (!Admin) Admin = (await import('../Admin.js')).default;
  if (!DepartmentHead) DepartmentHead = (await import('../DepartmentHead.js')).default;
  if (!Teacher) Teacher = (await import('../Teacher.js')).default;
};

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

// Get all students (with department filtering for department heads)
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
    
    // If user is a department head, only show students from their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      // Find classes in the department head's department
      const classes = await Class.find({ department: user.departmentId });
      const classIds = classes.map(cls => cls._id);
      
      query = { class: { $in: classIds } };
    }
    
    const students = await Student.find(query).populate('department').populate('class').sort({ createdAt: -1 });
    
    res.json({
      message: 'Students retrieved successfully',
      data: students,
      count: students.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      message: 'Error retrieving students',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student by ID (with department filtering for department heads)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).populate('department').populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Student retrieved successfully',
      data: student,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      message: 'Error retrieving student',
      error: error.message,
      status: 'error'
    });
  }
});

// Get students by class ID
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const students = await Student.find({ class: classId }).populate('department').populate('class');
    
    res.json({
      message: 'Students retrieved successfully',
      data: students,
      count: students.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching students by class:', error);
    res.status(500).json({
      message: 'Error retrieving students by class',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new student
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Student creation request body:', req.body);
    const { name, userId, department, class: classId, email, password, phoneNo } = req.body;
    
    // Validate required fields
    if (!name || !userId || !department || !classId || !email || !password || !phoneNo) {
      console.log('Missing required fields:', { name, userId, department, classId, email, password, phoneNo });
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if student with this userId already exists
    const existingStudent = await Student.findOne({ userId });
    
    if (existingStudent) {
      return res.status(400).json({
        message: 'Student with this user ID already exists',
        status: 'error'
      });
    }
    
    // Check if student with this email already exists
    const existingStudentEmail = await Student.findOne({ email });
    
    if (existingStudentEmail) {
      return res.status(400).json({
        message: 'Student with this email already exists',
        status: 'error'
      });
    }
    
    // Check if student with this phone number already exists
    const existingStudentPhone = await Student.findOne({ phoneNo });
    
    if (existingStudentPhone) {
      return res.status(400).json({
        message: 'Student with this phone number already exists',
        status: 'error'
      });
    }
    
    // Check if email or phone number already exists in other user types (Admin, DepartmentHead, Teacher)
    const Admin = (await import('../Admin.js')).default;
    const DepartmentHead = (await import('../DepartmentHead.js')).default;
    const Teacher = (await import('../Teacher.js')).default;
    
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingDepartmentHead = await DepartmentHead.findOne({ email });
    if (existingDepartmentHead) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    // Check if phone number already exists in other user types (DepartmentHead, Teacher)
    // Note: Admin doesn't have a phone number field
    const existingDepartmentHeadPhone = await DepartmentHead.findOne({ phoneNo });
    if (existingDepartmentHeadPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    // Note: Teacher uses 'phoneNumber' field instead of 'phoneNo'
    const existingTeacherPhone = await Teacher.findOne({ phoneNumber: phoneNo });
    if (existingTeacherPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    // Create new student
    const student = new Student({
      name,
      userId,
      department,
      class: classId,
      email,
      password,
      phoneNo
    });
    
    await student.save();
    
    // Populate the response with referenced data
    const savedStudent = await Student.findById(student._id).populate('department').populate('class');
    
    res.status(201).json({
      message: 'Student created successfully',
      data: savedStudent,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating student:', error);
    
    
    if (error.code === 11000) {
      if (error.keyPattern.userId) {
        return res.status(400).json({
          message: 'Student with this user ID already exists',
          status: 'error'
        });
      } else if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Student with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNo) {
        return res.status(400).json({
          message: 'Student with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error creating student',
      error: error.message,
      status: 'error'
    });
  }
});

// Bulk upload students via CSV (with predefined department and class)
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
    console.log('=== BULK UPLOAD DEBUG INFO ===');
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

    // Get department and class from form data (these are in req.body when sent via FormData)
    const departmentId = req.body.departmentId;
    const classId = req.body.classId;
    
    console.log('Department ID:', departmentId);
    console.log('Class ID:', classId);
    
    // Validate that department and class are provided
    if (!departmentId || !classId) {
      return res.status(400).json({
        message: 'Department and class must be specified',
        status: 'error'
      });
    }

    // Parse CSV data
    const students = [];
    const errors = [];
    
    const stream = Readable.from(csvFile.buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        // Validate required fields (excluding department and class which are pre-selected)
        if (!row.userId || !row.name || !row.email || !row.password || !row.phoneNo) {
          errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
          return;
        }
        
        students.push({
          userId: row.userId,
          name: row.name,
          department: departmentId, // Use pre-selected department
          class: classId, // Use pre-selected class
          email: row.email,
          password: row.password,
          phoneNo: row.phoneNo
        });
      })
      .on('end', async () => {
        // Process students
        const createdStudents = [];
        const duplicateErrors = [];
        
        for (const studentData of students) {
          try {
            // Check if student already exists
            const existingStudent = await Student.findOne({
              $or: [
                { userId: studentData.userId },
                { email: studentData.email },
                { phoneNo: studentData.phoneNo }
              ]
            });
            
            console.log(`Checking for duplicate student: ${studentData.userId}, ${studentData.email}, ${studentData.phoneNo}`);
            console.log(`Existing student found: ${existingStudent ? 'Yes' : 'No'}`);
            
            if (existingStudent) {
              let duplicateField = '';
              if (existingStudent.userId === studentData.userId) {
                duplicateField = `user ID ${studentData.userId}`;
              } else if (existingStudent.email === studentData.email) {
                duplicateField = `email ${studentData.email}`;
              } else if (existingStudent.phoneNo === studentData.phoneNo) {
                duplicateField = `phone number ${studentData.phoneNo}`;
              }
              const errorMessage = `Student with ${duplicateField} already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            // Check if email already exists in other user types (Admin, DepartmentHead, Teacher)
            const Admin = (await import('../Admin.js')).default;
            const DepartmentHead = (await import('../DepartmentHead.js')).default;
            const Teacher = (await import('../Teacher.js')).default;
            
            const existingAdmin = await Admin.findOne({ email: studentData.email });
            if (existingAdmin) {
              const errorMessage = `A user with this email already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            const existingDepartmentHead = await DepartmentHead.findOne({ email: studentData.email });
            if (existingDepartmentHead) {
              const errorMessage = `A user with this email already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            const existingTeacher = await Teacher.findOne({ email: studentData.email });
            if (existingTeacher) {
              const errorMessage = `A user with this email already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            // Check if phone number already exists in other user types (DepartmentHead, Teacher)
            // Note: Admin doesn't have a phone number field
            const existingDepartmentHeadPhone = await DepartmentHead.findOne({ phoneNo: studentData.phoneNo });
            if (existingDepartmentHeadPhone) {
              const errorMessage = `A user with this phone number already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            // Note: Teacher uses 'phoneNumber' field instead of 'phoneNo'
            const existingTeacherPhone = await Teacher.findOne({ phoneNumber: studentData.phoneNo });
            if (existingTeacherPhone) {
              const errorMessage = `A user with this phone number already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              duplicateErrors.push(errorMessage);
              continue;
            }
            
            // Create new student
            console.log(`Creating new student: ${studentData.userId}`);
            const student = new Student(studentData);
            await student.save();
            console.log(`Student created successfully: ${student.userId}`);
            createdStudents.push({
              id: student._id,
              userId: student.userId,
              name: student.name,
              email: student.email,
              phoneNo: student.phoneNo
            });
          } catch (error) {
            duplicateErrors.push(`Error creating student ${studentData.userId}: ${error.message}`);
          }
        }
        
        // Return response
        res.json({
          message: `${createdStudents.length} students created successfully`,
          data: {
            created: createdStudents,
            duplicates: duplicateErrors.length,
            errors: [...errors, ...duplicateErrors]
          },
          status: (errors.length > 0 || duplicateErrors.length > 0) ? 'error' : 'success'
        });
      })
      .on('error', (error) => {
        res.status(500).json({
          message: 'Error parsing CSV file',
          error: error.message,
          status: 'error'
        });
      });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      message: 'Error during bulk upload',
      error: error.message,
      status: 'error'
    });
  }
});

// Update student by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Student update request body:', req.body);
    const { name, userId, department, class: classId, email, phoneNo } = req.body;
    
    // Validate required fields (password is not required for updates)
    if (!name || !userId || !department || !classId || !email || !phoneNo) {
      console.log('Missing required fields for update:', { name, userId, department, classId, email, phoneNo });
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if another student with this userId already exists
    const existingUserId = await Student.findOne({
      userId,
      _id: { $ne: id }
    });
    
    if (existingUserId) {
      return res.status(400).json({
        message: 'Student with this user ID already exists',
        status: 'error'
      });
    }
    
    // Check if another student with this email already exists
    const existingEmail = await Student.findOne({
      email,
      _id: { $ne: id }
    });
    
    if (existingEmail) {
      return res.status(400).json({
        message: 'Student with this email already exists',
        status: 'error'
      });
    }
    
    // Check if another student with this phone number already exists
    const existingPhone = await Student.findOne({
      phoneNo,
      _id: { $ne: id }
    });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'Student with this phone number already exists',
        status: 'error'
      });
    }
    
    const student = await Student.findByIdAndUpdate(
      id,
      { name, userId, department, class: classId, email, phoneNo },
      { new: true, runValidators: true }
    ).populate('department').populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Student updated successfully',
      data: student,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.userId) {
        return res.status(400).json({
          message: 'Student with this user ID already exists',
          status: 'error'
        });
      } else if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Student with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNo) {
        return res.status(400).json({
          message: 'Student with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error updating student',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete student by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByIdAndDelete(id);
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Student deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      message: 'Error deleting student',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student courses (from both regular and added courses)
router.get('/:id/courses', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import AddStudent and Course models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Course = (await import('../Course.js')).default;
    
    // Get the student
    const student = await Student.findById(id).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }

    // Get regular courses for the student's class
    const regularCourses = await Course.find({ class: student.class._id })
      .populate('department')
      .populate('class')
      .populate('teacher');
    
    // Get added courses for this student
    const addedCoursesRecords = await AddStudent.find({ student: id, status: 'enrolled' })
      .populate('course');
    
    // Extract course details from added courses
    const addedCourses = addedCoursesRecords.map(record => record.course);
    
    // Combine regular and added courses
    const allCourses = [...regularCourses, ...addedCourses];

    res.json({
      message: 'Student courses retrieved successfully',
      data: allCourses,
      count: allCourses.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({
      message: 'Error retrieving student courses',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student exams (from both regular and added courses)
router.get('/:id/exams', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import AddStudent and Exam models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Exam = (await import('../Exam.js')).default;
    const Course = (await import('../Course.js')).default;
    
    // Get the student
    const student = await Student.findById(id).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }

    // Get regular courses for the student's class
    const regularCourses = await Course.find({ class: student.class._id });
    const regularCourseIds = regularCourses.map(course => course._id);
    
    // Get added courses for this student
    const addedCoursesRecords = await AddStudent.find({ student: id, status: 'enrolled' });
    const addedCourseIds = addedCoursesRecords.map(record => record.course);
    
    // Combine course IDs
    const allCourseIds = [...regularCourseIds, ...addedCourseIds];
    
    // Get exams for all courses
    let exams = await Exam.find({
      course: { $in: allCourseIds }
    })
    .populate('course')
    .populate('class')
    .sort({ date: 1 });

    // Filter exams to only show currently available ones for students
    const now = new Date();
    const filteredExams = exams.filter(exam => {
      // Check if exam has started (with a small buffer for timing)
      const fiveSecondsAgo = new Date(now.getTime() - 5000);
      if (exam.startTime > now && exam.startTime > fiveSecondsAgo) {
        return false; // Exam hasn't started yet
      }
      
      // Calculate end time: startTime + duration (in minutes)
      const endTime = new Date(exam.startTime.getTime() + exam.duration * 60000);
      
      // Check if exam has ended
      if (now >= endTime) {
        return false; // Exam has already ended
      }
      
      return true; // Exam is currently available
    });

    res.json({
      message: 'Student exams retrieved successfully',
      data: filteredExams,
      count: filteredExams.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({
      message: 'Error retrieving student exams',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student results
router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import Result model
    const Result = (await import('../Result.js')).default;
    
    // Get results for this student that are visible to students
    const results = await Result.find({ 
      student: id,
      isVisibleToStudent: true // Only return results that are visible to students
    })
      .populate('student')
      .populate('course')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Student results retrieved successfully',
      data: results,
      count: results.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      message: 'Error retrieving student results',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student announcements (from classes they belong to)
router.get('/:id/announcements', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import AddStudent and Announcement models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Announcement = (await import('../Announcement.js')).default;
    const Course = (await import('../Course.js')).default;
    
    // Get the student
    const student = await Student.findById(id).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }

    // Get regular courses for the student's class
    const regularCourses = await Course.find({ class: student.class._id });
    const regularClassIds = regularCourses.map(course => course.class);
    
    // Get added courses for this student
    const addedCoursesRecords = await AddStudent.find({ student: id, status: 'enrolled' });
    const addedClassIds = addedCoursesRecords.map(record => record.assignedClass);
    
    // Combine class IDs
    const allClassIds = [...regularClassIds, ...addedClassIds];
    
    // Get announcements for all classes
    const announcements = await Announcement.find({
      class: { $in: allClassIds }
    })
    .populate('class')
    .populate('teacher')
    .sort({ createdAt: -1 });

    res.json({
      message: 'Student announcements retrieved successfully',
      data: announcements,
      count: announcements.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student announcements:', error);
    res.status(500).json({
      message: 'Error retrieving student announcements',
      error: error.message,
      status: 'error'
    });
  }
});

// Get student assignments (from both regular and added courses)
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import AddStudent and Assignment models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Assignment = (await import('../Assignment.js')).default;
    const Course = (await import('../Course.js')).default;
    
    // Get the student
    const student = await Student.findById(id).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }

    // Get regular courses for the student's class
    const regularCourses = await Course.find({ class: student.class._id });
    const regularClassIds = regularCourses.map(course => course.class);
    
    // Get added courses for this student
    const addedCoursesRecords = await AddStudent.find({ student: id, status: 'enrolled' });
    const addedClassIds = addedCoursesRecords.map(record => record.assignedClass);
    
    // Combine class IDs
    const allClassIds = [...regularClassIds, ...addedClassIds];
    
    // Get assignments for all classes
    let assignments = await Assignment.find({
      class: { $in: allClassIds }
    })
    .populate('class')
    .populate('teacher')
    .sort({ createdAt: -1 });
    
    // Populate course information for each assignment
    const assignmentsWithCourses = [];
    for (let assignment of assignments) {
      // Convert to plain object
      const assignmentObj = assignment.toObject();
      
      // Find the course that matches this assignment's class
      const course = await Course.findOne({ class: assignment.class._id }).populate('teacher').populate('department');
      if (course) {
        assignmentObj.course = course;
      }
      
      assignmentsWithCourses.push(assignmentObj);
    }
    
    assignments = assignmentsWithCourses;

    res.json({
      message: 'Student assignments retrieved successfully',
      data: assignments,
      count: assignments.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      message: 'Error retrieving student assignments',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
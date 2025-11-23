import express from 'express';
import Student from '../Student.js';
import Class from '../Class.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all students (with class filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { class: classId, department: departmentId } = req.query;
    let query = {};
    
    if (classId) {
      query.class = classId;
    }
    
    if (departmentId) {
      query.department = departmentId;
    }
    
    const students = await Student.find(query)
      .populate('department')
      .populate('class')
      .sort({ createdAt: -1 });
    
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

// Get student by ID
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

// Create new student
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, userId, department, class: classId, email, password, phoneNo } = req.body;
    
    // Validate required fields
    if (!name || !userId || !department || !classId || !email || !password || !phoneNo) {
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
    const existingEmail = await Student.findOne({ email });
    
    if (existingEmail) {
      return res.status(400).json({
        message: 'Student with this email already exists',
        status: 'error'
      });
    }
    
    // Check if student with this phone number already exists
    const existingPhone = await Student.findOne({ phoneNo });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'Student with this phone number already exists',
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

// Update student by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Student update request received:', { id, body: req.body });
    const { name, userId, department, class: classId, email, phoneNo, password } = req.body;
    
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
      console.log('Student with this user ID already exists:', userId);
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
      console.log('Student with this email already exists:', email);
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
      console.log('Student with this phone number already exists:', phoneNo);
      return res.status(400).json({
        message: 'Student with this phone number already exists',
        status: 'error'
      });
    }
    
    // Prepare update data
    const updateData = { name, userId, department, class: classId, email, phoneNo };
    
    // If password is provided, update it as well
    if (password) {
      if (password.length < 6) {
        console.log('Password too short:', password.length);
        return res.status(400).json({
          message: 'Password must be at least 6 characters long',
          status: 'error'
        });
      }
      // Important: We need to manually hash the password since findByIdAndUpdate bypasses middleware
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Find the student and update manually to ensure pre-save hooks are triggered
    const student = await Student.findById(id);
    
    if (!student) {
      console.log('Student not found:', id);
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    // Update student fields
    Object.assign(student, updateData);
    await student.save();
    
    // Populate the response with referenced data
    const savedStudent = await Student.findById(student._id).populate('department').populate('class');
    
    console.log('Student updated successfully:', savedStudent._id);
    res.json({
      message: 'Student updated successfully',
      data: savedStudent,
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
    
    // Get added courses for this student (including retake courses)
    // Include both 'enrolled' and 'pending' status records
    const addedCoursesRecords = await AddStudent.find({ 
      student: id, 
      status: { $in: ['enrolled', 'pending'] } 
    })
      .populate({
        path: 'course',
        populate: [
          { path: 'department' },
          { path: 'class' },
          { path: 'teacher' }
        ]
      })
      .populate('assignedClass')
      .populate('originalClass');
    
    // Extract course details from added courses and mark them as retake courses
    const addedCourses = addedCoursesRecords.map(record => {
      const course = record.course.toObject();
      course.isRetake = true;
      course.originalClass = record.originalClass;
      course.assignedClass = record.assignedClass;
      course.retakeSemester = record.retakeSemester;
      course.retakeStatus = record.status; // Add status information
      return course;
    });
    
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

// Bulk upload students via CSV
router.post('/bulk-upload', authenticateToken, async (req, res) => {
  try {
    // Import required modules
    const multer = (await import('multer')).default;
    const csv = (await import('csv-parser')).default;
    const { Readable } = await import('stream');
    
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
    
    // Handle the file upload with proper error handling
    csvUpload.single('file')(req, res, async (err) => {
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
      
      try {
        // Debug logging to see what we received
        console.log('=== STUDENT BULK UPLOAD DEBUG INFO ===');
        console.log('File received:', req.file);
        console.log('Body received:', req.body);
        console.log('Department ID:', req.body.departmentId);
        console.log('Class ID:', req.body.classId);
        
        // Check if file was uploaded
        if (!req.file) {
          console.log('ERROR: No CSV file found in request');
          return res.status(400).json({
            message: 'No CSV file uploaded',
            status: 'error'
          });
        }
        
        // Validate required fields from form data
        const { departmentId, classId } = req.body;
        if (!departmentId || !classId) {
          console.log('ERROR: Missing departmentId or classId');
          return res.status(400).json({
            message: 'Department and class must be selected for bulk upload',
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
          const studentData = resultsFromCsv[i];
          console.log(`Processing row ${i + 1}:`, studentData);

          try {
            // Validate required fields
            const requiredFields = ['name', 'email', 'phoneNo', 'userId', 'password'];
            const missingFields = requiredFields.filter(field => !studentData[field] || studentData[field].trim() === '');
            
            if (missingFields.length > 0) {
              throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Clean the data
            const cleanedData = {
              name: studentData.name.trim(),
              email: studentData.email.trim().toLowerCase(),
              phoneNo: studentData.phoneNo.trim(),
              userId: studentData.userId.trim(),
              password: studentData.password.trim(),
              department: departmentId, // Use the department from form data
              class: classId // Use the class from form data
            };

            // Check if student with same email or userId already exists
            const existingStudent = await Student.findOne({
              $or: [
                { email: cleanedData.email },
                { userId: cleanedData.userId },
                { phoneNo: cleanedData.phoneNo }
              ]
            });
            
            console.log(`Checking for duplicate student: ${cleanedData.userId}, ${cleanedData.email}`);
            console.log(`Existing student found: ${existingStudent ? 'Yes' : 'No'}`);
            
            if (existingStudent) {
              let duplicateField = '';
              if (existingStudent.userId === cleanedData.userId) {
                duplicateField = `user ID ${cleanedData.userId}`;
              } else if (existingStudent.email === cleanedData.email) {
                duplicateField = `email ${cleanedData.email}`;
              } else if (existingStudent.phoneNo === cleanedData.phoneNo) {
                duplicateField = `phone number ${cleanedData.phoneNo}`;
              }
              const errorMessage = `Student with ${duplicateField} already exists`;
              console.log(`Duplicate found: ${errorMessage}`);
              throw new Error(errorMessage);
            }

            // Create new student (password will be hashed by pre-save hook)
            console.log(`Creating new student: ${cleanedData.userId}`);
            const newStudent = new Student(cleanedData);
            
            console.log('Attempting to save student:', newStudent);

            await newStudent.save();
            console.log('Student saved successfully:', newStudent._id);
            addedCount++;
            results.push({
              userId: cleanedData.userId,
              email: cleanedData.email,
              status: 'success'
            });
          } catch (error) {
            console.error('Error processing student:', error);
            errors.push({
              row: i + 1,
              userId: studentData.userId,
              email: studentData.email,
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
  } catch (error) {
    console.error('Bulk upload setup error:', error);
    res.status(500).json({
      message: error.message || 'Error setting up bulk upload',
      status: 'error'
    });
  }
});

// Get next class information for a student
router.post('/next-class', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.body;
    
    // Validate required fields
    if (!studentId) {
      return res.status(400).json({
        message: 'Student ID is required',
        status: 'error'
      });
    }
    
    // Find the student and populate their class information
    const student = await Student.findById(studentId).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    // Get current class information
    const currentClass = student.class;
    
    if (!currentClass) {
      return res.status(400).json({
        message: 'Student is not assigned to a class',
        status: 'error'
      });
    }
    
    let nextClass = null;
    let nextClassName = '';
    
    // Determine the next class based on current class
    if (currentClass.semester === 'first') {
      // If currently in first semester, move to second semester of same year
      nextClass = await Class.findOne({
        department: currentClass.department,
        year: currentClass.year,
        semester: 'second'
      });
      nextClassName = `Year ${currentClass.year}, Second Semester`;
    } else {
      // If currently in second semester, move to first semester of next year
      nextClass = await Class.findOne({
        department: currentClass.department,
        year: currentClass.year + 1,
        semester: 'first'
      });
      nextClassName = `Year ${currentClass.year + 1}, First Semester`;
    }
    
    // If next class doesn't exist, return an error
    if (!nextClass) {
      return res.status(404).json({
        message: `Next class (${nextClassName}) not found. Please create the class first.`,
        status: 'error',
        data: {
          currentClass: {
            _id: currentClass._id,
            year: currentClass.year,
            semester: currentClass.semester
          }
        }
      });
    }
    
    res.json({
      message: 'Next class information retrieved successfully',
      data: {
        currentClass: {
          _id: currentClass._id,
          year: currentClass.year,
          semester: currentClass.semester
        },
        nextClass: {
          _id: nextClass._id,
          year: nextClass.year,
          semester: nextClass.semester
        },
        studentId: student._id
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error getting next class information:', error);
    res.status(500).json({
      message: 'Error retrieving next class information',
      error: error.message,
      status: 'error'
    });
  }
});

// Upgrade students to next class
router.post('/upgrade-class', authenticateToken, async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    // Validate required fields
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        message: 'Student IDs are required',
        status: 'error'
      });
    }
    
    const updatedStudents = [];
    const errors = [];
    
    // Process each student
    for (const studentId of studentIds) {
      try {
        // Find the student and populate their class information
        const student = await Student.findById(studentId).populate('class');
        
        if (!student) {
          errors.push(`Student with ID ${studentId} not found`);
          continue;
        }
        
        // Get current class information
        const currentClass = student.class;
        
        if (!currentClass) {
          errors.push(`Student ${student.name} is not assigned to a class`);
          continue;
        }
        
        let nextClass = null;
        
        // Determine the next class based on current class
        if (currentClass.semester === 'first') {
          // If currently in first semester, move to second semester of same year
          nextClass = await Class.findOne({
            department: currentClass.department,
            year: currentClass.year,
            semester: 'second'
          });
        } else {
          // If currently in second semester, move to first semester of next year
          nextClass = await Class.findOne({
            department: currentClass.department,
            year: currentClass.year + 1,
            semester: 'first'
          });
        }
        
        // If next class doesn't exist, add to errors
        if (!nextClass) {
          const nextClassName = currentClass.semester === 'first' 
            ? `Year ${currentClass.year}, Second Semester` 
            : `Year ${currentClass.year + 1}, First Semester`;
          errors.push(`Next class (${nextClassName}) not found for student ${student.name}. Please create the class first.`);
          continue;
        }
        
        // Update student's class
        student.class = nextClass._id;
        await student.save();
        
        // Add to updated students list
        updatedStudents.push({
          studentId: student._id,
          name: student.name,
          previousClass: {
            _id: currentClass._id,
            year: currentClass.year,
            semester: currentClass.semester
          },
          newClass: {
            _id: nextClass._id,
            year: nextClass.year,
            semester: nextClass.semester
          }
        });
      } catch (studentError) {
        errors.push(`Error processing student ${studentId}: ${studentError.message}`);
      }
    }
    
    res.json({
      message: `${updatedStudents.length} students upgraded successfully`,
      data: {
        updatedStudents,
        errors
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error upgrading students:', error);
    res.status(500).json({
      message: 'Error upgrading students',
      error: error.message,
      status: 'error'
    });
  }
});

// Get schedules for a specific student
router.get('/:id/schedules', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get student with their class information
    const student = await Student.findById(id).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
    
    // Import Schedule model
    const Schedule = (await import('../Schedule.js')).default;
    
    // Find schedules for the student's class
    const schedules = await Schedule.find({ class: student.class._id })
      .populate('class')
      .populate('course')
      .populate('department')
      .sort({ dayOfWeek: 1, startTime: 1 });
    
    res.json({
      message: 'Schedules retrieved successfully',
      data: schedules,
      count: schedules.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    res.status(500).json({
      message: 'Error retrieving schedules',
      error: error.message,
      status: 'error'
    });
  }
});

// Get assignments for student's enrolled courses
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import required models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Course = (await import('../Course.js')).default;
    const Assignment = (await import('../Assignment.js')).default;

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
    
    // Get added courses for this student (including retake courses)
    // Include both 'enrolled' and 'pending' status records
    const addedCoursesRecords = await AddStudent.find({ 
      student: id, 
      status: { $in: ['enrolled', 'pending'] } 
    }).populate('course');
    
    const addedCourseIds = addedCoursesRecords.map(record => record.course._id);
    
    // Combine all course IDs
    const allCourseIds = [...regularCourseIds, ...addedCourseIds];
    
    // If student has no courses, return empty array
    if (allCourseIds.length === 0) {
      return res.json({
        message: 'Assignments retrieved successfully',
        data: [],
        count: 0,
        status: 'success'
      });
    }
    
    // Get classes for all courses
    const coursesWithClasses = await Course.find({
      _id: { $in: allCourseIds }
    }).select('class');
    
    const classIds = coursesWithClasses.map(course => course.class);
    
    // Get assignments for these classes
    const assignments = await Assignment.find({
      class: { $in: classIds }
    }).populate('class').populate('teacher').sort({ createdAt: -1 });
    
    // For each assignment, find the corresponding course
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      // Find courses that belong to the same class as this assignment and populate all fields
      const courseForAssignment = await Course.findOne({ class: assignment.class._id || assignment.class })
        .populate('teacher')
        .populate('department')
        .populate('class');
      if (courseForAssignment) {
        // Add course information to the assignment
        assignment.course = courseForAssignment;
      }
    }
    
    // Convert assignments to plain objects to ensure course data is included
    const assignmentsWithCourse = assignments.map(assignment => {
      const assignmentObj = assignment.toObject ? assignment.toObject() : assignment;
      if (assignment.course) {
        assignmentObj.course = assignment.course.toObject ? assignment.course.toObject() : assignment.course;
      }
      return assignmentObj;
    });

    res.json({
      message: 'Assignments retrieved successfully',
      data: assignmentsWithCourse,
      count: assignmentsWithCourse.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      message: 'Error retrieving assignments',
      error: error.message,
      status: 'error'
    });
  }
});

// Get announcements for student's enrolled courses
router.get('/:id/announcements', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Import required models
    const AddStudent = (await import('../AddStudent.js')).default;
    const Course = (await import('../Course.js')).default;
    const Announcement = (await import('../Announcement.js')).default;

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
    
    // Get added courses for this student (including retake courses)
    // Include both 'enrolled' and 'pending' status records
    const addedCoursesRecords = await AddStudent.find({ 
      student: id, 
      status: { $in: ['enrolled', 'pending'] } 
    }).populate('course');
    
    const addedCourseIds = addedCoursesRecords.map(record => record.course._id);
    
    // Combine all course IDs
    const allCourseIds = [...regularCourseIds, ...addedCourseIds];
    
    // If student has no courses, return empty array
    if (allCourseIds.length === 0) {
      return res.json({
        message: 'Announcements retrieved successfully',
        data: [],
        count: 0,
        status: 'success'
      });
    }
    
    // Get classes for all courses
    const coursesWithClasses = await Course.find({
      _id: { $in: allCourseIds }
    }).select('class');
    
    const classIds = coursesWithClasses.map(course => course.class);
    
    // Get announcements for these classes
    const announcements = await Announcement.find({
      class: { $in: classIds }
    }).populate('class').populate('teacher').sort({ createdAt: -1 });

    res.json({
      message: 'Announcements retrieved successfully',
      data: announcements,
      count: announcements.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student announcements:', error);
    res.status(500).json({
      message: 'Error retrieving announcements',
      error: error.message,
      status: 'error'
    });
  }
});

// Change student password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    console.log('=== Student Change Password Endpoint Called ===');
    console.log('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      user: req.user
    });
      
    const { currentPassword, newPassword } = req.body;
    const studentId = req.user.id; // Get student ID from authenticated token
      
    console.log('Extracted data:', { studentId, currentPassword, newPassword });
    console.log('Data types:', { 
      currentPasswordType: typeof currentPassword, 
      newPasswordType: typeof newPassword,
      currentPasswordLength: currentPassword ? currentPassword.length : 0,
      newPasswordLength: newPassword ? newPassword.length : 0
    });
      
    // Validate required fields
    if (!currentPassword || !newPassword) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({
        message: 'Current password and new password are required',
        status: 'error'
      });
    }
      
    // Validate password length
    if (newPassword.length < 6) {
      console.log('Validation failed - password too short');
      return res.status(400).json({
        message: 'New password must be at least 6 characters long',
        status: 'error'
      });
    }
      
    // Find student by ID
    const student = await Student.findById(studentId);
    console.log('Student lookup result:', student ? 'Found' : 'Not found');
      
    if (!student) {
      console.log('Student not found for ID:', studentId);
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }
      
    // Check if current password is correct
    console.log('Checking current password...');
    const isMatch = await student.comparePassword(currentPassword);
    console.log('Password check result:', isMatch);
      
    if (!isMatch) {
      console.log('Current password is incorrect');
      return res.status(400).json({
        message: 'Current password is incorrect',
        status: 'error'
      });
    }
      
    // Update password
    console.log('Updating password...');
    student.password = newPassword;
    await student.save();
    console.log('Password updated successfully');
      
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

export default router;
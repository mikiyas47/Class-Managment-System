import express from 'express';
import mongoose from 'mongoose';
import AddStudent from '../AddStudent.js';
import Student from '../Student.js';
import Class from '../Class.js';
import Course from '../Course.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all students who need to retake courses
router.get('/', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const { status, courseId, classId } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (courseId) query.course = courseId;
    if (classId) query.assignedClass = classId;
    
    const addStudents = await AddStudent.find(query)
      .populate('student', 'name userId email')
      .populate('originalClass', 'year semester department')
      .populate('assignedClass', 'year semester department')
      .populate('course', 'subject code')
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      count: addStudents.length,
      data: addStudents
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching add students data',
      error: error.message
    });
  }
});

// Get a specific add student record
router.get('/:id', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const addStudent = await AddStudent.findById(req.params.id)
      .populate('student', 'name userId email')
      .populate('originalClass', 'year semester department')
      .populate('assignedClass', 'year semester department')
      .populate('course', 'subject code');
    
    if (!addStudent) {
      return res.status(404).json({
        status: 'error',
        message: 'Add student record not found'
      });
    }
    
    res.json({
      status: 'success',
      data: addStudent
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching add student record',
      error: error.message
    });
  }
});

// Create a new add student record (for students who need to retake courses)
router.post('/', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const { studentId, courseId, retakeSemester } = req.body;
    
    // Validate required fields
    if (!studentId || !courseId || !retakeSemester) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: studentId, courseId, retakeSemester'
      });
    }
    
    // Check if student exists and populate class information
    const student = await Student.findById(studentId).populate('class');
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }
    
    // Check if course exists and populate class information
    const course = await Course.findById(courseId).populate('class');
    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }
    
    // Automatically set assigned class to course's class
    const assignedClassId = course.class._id || course.class;
    
    // Check if assigned class exists
    const assignedClass = await Class.findById(assignedClassId);
    if (!assignedClass) {
      return res.status(404).json({
        status: 'error',
        message: 'Assigned class not found'
      });
    }
    
    // Get student's original class
    // Check if student has a class before querying
    let originalClass = null;
    if (student.class) {
      originalClass = await Class.findById(student.class._id || student.class);
      if (!originalClass) {
        return res.status(404).json({
          status: 'error',
          message: 'Student original class not found'
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Student is not assigned to a class'
      });
    }
    
    // Validate that assigned class is appropriate for retaking (should be same year or lower)
    // Compare both year and semester to determine if it's appropriate for retaking
    const isAppropriateForRetake = 
      assignedClass.year < originalClass.year || // Lower year
      (assignedClass.year === originalClass.year && originalClass.semester === 'second' && assignedClass.semester === 'first'); // Same year, but earlier semester
    
    if (!isAppropriateForRetake) {
      return res.status(400).json({
        status: 'error',
        message: 'Assigned class must be from a previous academic period (lower year or earlier semester in the same year)'
      });
    }
    
    // Check if record already exists
    const existingRecord = await AddStudent.findOne({
      student: studentId,
      course: courseId
    });
    
    if (existingRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Student already has a record for this course'
      });
    }
    
    // Create new add student record
    const addStudent = new AddStudent({
      student: studentId,
      originalClass: student.class && student.class._id ? student.class._id : student.class,
      course: courseId,
      assignedClass: assignedClassId,
      retakeSemester
    });
    
    await addStudent.save();
    
    // Populate the response
    const populatedAddStudent = await AddStudent.findById(addStudent._id)
      .populate('student', 'name userId email')
      .populate('originalClass', 'year semester department')
      .populate('assignedClass', 'year semester department')
      .populate('course', 'subject code');
    
    res.status(201).json({
      status: 'success',
      message: 'Add student record created successfully',
      data: populatedAddStudent
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error creating add student record',
      error: error.message
    });
  }
});

// Update an add student record
router.put('/:id', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const { assignedClassId, status } = req.body;
    
    // Find the add student record
    const addStudent = await AddStudent.findById(req.params.id);
    if (!addStudent) {
      return res.status(404).json({
        status: 'error',
        message: 'Add student record not found'
      });
    }
    
    // Update fields if provided
    if (assignedClassId) {
      // Check if assigned class exists
      const assignedClass = await Class.findById(assignedClassId);
      if (!assignedClass) {
        return res.status(404).json({
          status: 'error',
          message: 'Assigned class not found'
        });
      }
      
      // Get student's original class
      const student = await Student.findById(addStudent.student);
      // Check if student has a class before querying
      let originalClass = null;
      if (student && student.class) {
        originalClass = await Class.findById(student.class);
      }
      
      // Validate that assigned class is appropriate for retaking (should be same year or lower)
      // Compare both year and semester to determine if it's appropriate for retaking
      const isAppropriateForRetake = 
        assignedClass.year < originalClass.year || // Lower year
        (assignedClass.year === originalClass.year && originalClass.semester === 'second' && assignedClass.semester === 'first'); // Same year, but earlier semester
      
      if (!isAppropriateForRetake) {
        return res.status(400).json({
          status: 'error',
          message: 'Assigned class must be from a previous academic period (lower year or earlier semester in the same year)'
        });
      }
      
      addStudent.assignedClass = assignedClassId;
    }
    
    if (status) addStudent.status = status;
    
    await addStudent.save();
    
    // Populate the response
    const populatedAddStudent = await AddStudent.findById(addStudent._id)
      .populate('student', 'name userId email')
      .populate('originalClass', 'year semester department')
      .populate('assignedClass', 'year semester department')
      .populate('course', 'subject code');
    
    res.json({
      status: 'success',
      message: 'Add student record updated successfully',
      data: populatedAddStudent
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating add student record',
      error: error.message
    });
  }
});

// Get students by class ID
router.get('/students-by-class/:classId', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const { classId } = req.params;
    console.log('Fetching students by class ID:', classId);
    console.log('User:', req.user);
    
    // Validate that the class ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      console.log('Invalid class ID format:', classId);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid class ID format'
      });
    }
    
    console.log('Querying students with class:', classId);
    // Find students belonging to the specified class
    const students = await Student.find({ class: classId })
      .select('name userId email')
      .sort({ name: 1 });
    
    console.log('Found students:', students.length);
    res.json({
      status: 'success',
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error fetching students by class:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching students by class',
      error: error.message
    });
  }
});

// Get courses by class ID
router.get('/courses-by-class/:classId', authenticateToken, authorizeRole(['admin', 'department-head']), async (req, res) => {
  try {
    const { classId } = req.params;
    console.log('Fetching courses by class ID:', classId);
    console.log('User:', req.user);
    
    // Validate that the class ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      console.log('Invalid class ID format:', classId);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid class ID format'
      });
    }
    
    console.log('Querying courses with class:', classId);
    // Find courses belonging to the specified class
    const courses = await Course.find({ class: classId })
      .select('subject code')
      .populate('department', 'name')
      .sort({ subject: 1 });
    
    console.log('Found courses:', courses.length);
    res.json({
      status: 'success',
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses by class:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching courses by class',
      error: error.message
    });
  }
});

// Delete an add student record
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const addStudent = await AddStudent.findByIdAndDelete(req.params.id);
    
    if (!addStudent) {
      return res.status(404).json({
        status: 'error',
        message: 'Add student record not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Add student record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting add student record',
      error: error.message
    });
  }
});

export default router;
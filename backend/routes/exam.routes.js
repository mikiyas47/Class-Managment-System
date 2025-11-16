import express from 'express';
import mongoose from 'mongoose';
import Exam from '../Exam.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all exams (with teacher filtering for teachers and time-based filtering for students)
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
    
    // Support filtering by course and title
    if (req.query.course) {
      // Validate that the course ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.course)) {
        return res.status(400).json({
          message: 'Invalid course ID format',
          status: 'error'
        });
      }
      query.course = req.query.course;
    }
    
    if (req.query.title) {
      query.title = req.query.title;
    }
    
    // If user is a teacher, only show exams created by that teacher
    if (user && user.userType === 'teacher' && user.teacherId) {
      query.teacher = user.teacherId;
    }
    // If user is a student, only show exams that are currently available 
    // (startTime <= now AND now < endTime where endTime = startTime + duration)
    else if (user && user.userType === 'student') {
      const now = new Date();
      query.startTime = { $lte: now };
      // We'll filter by endTime after fetching since it requires calculation
    }

    // Execute the query
    let exams = await Exam.find(query)
      .populate('course', 'subject')
      .populate('class')
      .populate('teacher')
      .sort({ createdAt: -1 });
    
    // For students, filter exams that haven't ended yet
    let filteredExams = exams;
    if (user && user.userType === 'student') {
      const now = new Date();
      filteredExams = exams.filter(exam => {
        // Calculate end time: startTime + duration (in minutes)
        const endTime = new Date(exam.startTime.getTime() + exam.duration * 60000);
        return now < endTime;
      });
      
      // Also filter to only show exams that have started (with a small buffer for timing)
      const fiveSecondsAgo = new Date(now.getTime() - 5000);
      filteredExams = filteredExams.filter(exam => {
        return exam.startTime <= now || exam.startTime <= fiveSecondsAgo;
      });
    }

    exams = filteredExams;
    
    console.log('Found exams:', exams.length);
    if (user && user.userType === 'student') {
      console.log('Exams available to student:', exams.map(e => ({
        id: e._id,
        title: e.title,
        startTime: e.startTime,
        duration: e.duration,
        now: new Date()
      })));
    }
    
    res.json({
      message: 'Exams retrieved successfully',
      data: exams,
      count: exams.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({
      message: 'Error retrieving exams',
      error: error.message,
      status: 'error'
    });
  }
});

// Get exam by ID (with teacher filtering for teachers and time-based filtering for students)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid exam ID format',
        status: 'error'
      });
    }
    
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
    
    // Build query
    let query = { _id: id };
    
    // If user is a teacher, only show exams created by that teacher
    if (user && user.userType === 'teacher' && user.teacherId) {
      query.teacher = user.teacherId;
    }
    // For students, we'll check time restrictions after fetching
    
    console.log('Exam by ID query:', query);
    
    const exam = await Exam.findOne(query).populate('class', 'year semester').populate('teacher', 'name email').populate('course', 'subject code');
    
    console.log('Found exam by ID:', exam ? exam._id : 'Not found');
    
    if (!exam) {
      // Check if exam exists but is not available yet
      const examExists = await Exam.findById(id);
      console.log('Exam exists check:', examExists ? 'Yes' : 'No');
      if (examExists && user && user.userType === 'student') {
        const now = new Date();
        console.log('Exam start time:', examExists.startTime, 'Current time:', now);
        if (examExists.startTime > now) {
          return res.status(403).json({
            message: 'This exam is not available yet. Please check back at the scheduled time.',
            status: 'error'
          });
        }
      }
      
      return res.status(404).json({
        message: 'Exam not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if the exam is currently available
    if (user && user.userType === 'student') {
      const now = new Date();
      // Check if exam has started
      if (exam.startTime > now) {
        return res.status(403).json({
          message: 'This exam is not available yet. Please check back at the scheduled time.',
          status: 'error'
        });
      }
      
      // Check if exam has ended
      const endTime = new Date(exam.startTime.getTime() + exam.duration * 60000);
      if (now >= endTime) {
        return res.status(403).json({
          message: 'This exam is no longer available. The exam time has ended.',
          status: 'error'
        });
      }
      
      // Check if student has already submitted this exam
      const StudentExam = (await import('../StudentExam.js')).default;
      const studentExam = await StudentExam.findOne({ 
        student: user.id, 
        exam: id 
      });
      
      if (studentExam && studentExam.submittedAt) {
        return res.status(403).json({
          message: 'You have already submitted this exam. Access denied.',
          status: 'error'
        });
      }
    }
    
    // If user is a teacher, check if they have access to this exam
    if (user && user.userType === 'teacher' && user.teacherId) {
      if (exam.teacher._id.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only view exams you created.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Exam retrieved successfully',
      data: exam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      message: 'Error retrieving exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new exam
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { class: classId, teacher, course, title, duration, startTime } = req.body;
    
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
    
    // If user is a teacher, they can only create exams for themselves
    if (user && user.userType === 'teacher' && user.teacherId) {
      if (teacher !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only create exams for yourself.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!classId || !teacher || !title || !duration || !startTime) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate that title is either "Mid-exam" or "Final-exam"
    if (title !== 'Mid-exam' && title !== 'Final-exam') {
      return res.status(400).json({
        message: 'Exam title must be either "Mid-exam" or "Final-exam"',
        status: 'error'
      });
    }
    
    const exam = new Exam({
      class: classId,
      teacher,
      course,
      title,
      duration: parseInt(duration),
      startTime
    });
    
    await exam.save();
    
    // Populate the response with referenced data
    const savedExam = await Exam.findById(exam._id)
      .populate('class', 'year semester')
      .populate('teacher', 'name email')
      .populate('course', 'subject code');
    
    res.status(201).json({
      message: 'Exam created successfully',
      data: savedExam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An exam with this title already exists for this class',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Update exam by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid exam ID format',
        status: 'error'
      });
    }
    const { class: classId, teacher, course, title, duration, startTime } = req.body;
    
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
    
    // If user is a teacher, check if they have access to this exam
    if (user && user.userType === 'teacher' && user.teacherId) {
      const exam = await Exam.findById(id);
      if (exam && exam.teacher.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only update exams you created.',
          status: 'error'
        });
      }
      
      // Teachers can't change the teacher of an exam
      if (teacher !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only update exams you created.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!classId || !teacher || !title || !duration || !startTime) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate that title is either "Mid-exam" or "Final-exam"
    if (title !== 'Mid-exam' && title !== 'Final-exam') {
      return res.status(400).json({
        message: 'Exam title must be either "Mid-exam" or "Final-exam"',
        status: 'error'
      });
    }
    
    const exam = await Exam.findByIdAndUpdate(
      id,
      {
        class: classId,
        teacher,
        course,
        title,
        duration: parseInt(duration),
        startTime
      },
      { new: true, runValidators: true }
    ).populate('class', 'year semester').populate('teacher', 'name email').populate('course', 'subject code');
    
    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Exam updated successfully',
      data: exam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An exam with this title already exists for this class',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete exam by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid exam ID format',
        status: 'error'
      });
    }
    
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
    
    // If user is a teacher, check if they have access to this exam
    if (user && user.userType === 'teacher' && user.teacherId) {
      const exam = await Exam.findById(id);
      if (exam && exam.teacher.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only delete exams you created.',
          status: 'error'
        });
      }
    }
    
    const exam = await Exam.findByIdAndDelete(id);
    
    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Exam deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({
      message: 'Error deleting exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Get exams for a specific student (filtered by enrolled courses)
router.get('/student/:id', authenticateToken, async (req, res) => {
  try {
    const { id: studentId } = req.params;

    // Import required models
    const Student = (await import('../Student.js')).default;
    const AddStudent = (await import('../AddStudent.js')).default;
    const Course = (await import('../Course.js')).default;

    // Get the student
    const student = await Student.findById(studentId).populate('class');
    
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
      student: studentId, 
      status: { $in: ['enrolled', 'pending'] } 
    }).populate('course');
    
    const addedCourseIds = addedCoursesRecords.map(record => record.course._id);
    
    // Combine all course IDs
    const allCourseIds = [...regularCourseIds, ...addedCourseIds];
    
    // If student has no courses, return empty array
    if (allCourseIds.length === 0) {
      return res.json({
        message: 'Exams retrieved successfully',
        data: [],
        count: 0,
        status: 'success'
      });
    }
    
    // Get exams for these courses with time-based filtering for students
    const now = new Date();
    let exams = await Exam.find({
      course: { $in: allCourseIds },
      startTime: { $lte: now }
    })
      .populate('course', 'subject')
      .populate('class')
      .populate('teacher')
      .sort({ createdAt: -1 });
    
    // Filter exams that haven't ended yet
    const filteredExams = exams.filter(exam => {
      // Calculate end time: startTime + duration (in minutes)
      const endTime = new Date(exam.startTime.getTime() + exam.duration * 60000);
      return now < endTime;
    });
    
    // Also filter to only show exams that have started (with a small buffer for timing)
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const finalExams = filteredExams.filter(exam => {
      return exam.startTime <= now || exam.startTime <= fiveSecondsAgo;
    });

    res.json({
      message: 'Exams retrieved successfully',
      data: finalExams,
      count: finalExams.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    res.status(500).json({
      message: 'Error retrieving exams',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
import express from 'express';
import StudentExam from '../StudentExam.js';
import Student from '../Student.js';
import Exam from '../Exam.js';
import Question from '../Question.js';
import Answer from '../Answer.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// JWT secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

// Helper function to calculate student exam score
const calculateStudentExamScore = async (studentExamId) => {
  try {
    // Get the student exam
    const studentExam = await StudentExam.findById(studentExamId).populate('exam');
    if (!studentExam) {
      throw new Error('Student exam not found');
    }
    
    // Get all answers for this student exam
    const answers = await Answer.find({ studentExam: studentExamId }).populate('question');
    
    console.log(`Found ${answers.length} answers for student exam ${studentExamId}`);
    
    if (answers.length === 0) {
      console.log('No answers found for student exam, score will be 0');
      return 0;
    }
    
    // Get all questions for this exam
    const questions = await Question.find({ exam: studentExam.exam._id });
    
    console.log(`Found ${questions.length} total questions for exam ${studentExam.exam._id}`);
    console.log(`Evaluating only the ${answers.length} questions that were answered by the student`);
    
    // Calculate score - now using raw count of correct answers instead of percentage
    let correctAnswers = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q._id.toString() === answer.question._id.toString());
      if (question && answer.selectedOption === question.correctOption) {
        correctAnswers++;
      }
    });
    
    // Use raw count of correct answers as the score
    const score = correctAnswers;
    
    // Update student exam with calculated score
    studentExam.score = score;
    await studentExam.save();
    
    console.log(`Calculated score for student exam ${studentExamId}: ${score} correct answers out of ${answers.length} answered questions`);
    return score;
  } catch (error) {
    console.error('Error calculating student exam score:', error);
    throw error;
  }
};

// Get all student exams
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
    
    // If user is a student, only show exams for that student
    if (user && user.userType === 'student' && user.id) {
      query.student = user.id;
    }
    
    // If filtering by student
    if (req.query.student) {
      query.student = req.query.student;
    }
    
    // If filtering by exam
    if (req.query.exam) {
      query.exam = req.query.exam;
    }
    
    const studentExams = await StudentExam.find(query)
      .populate('student')
      .populate('exam')
      .sort({ createdAt: -1 });
    
    res.json({
      message: 'Student exams retrieved successfully',
      data: studentExams,
      count: studentExams.length,
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

// Get student exam by ID (with student filtering for students)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid student exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid student exam ID format',
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
    
    const studentExam = await StudentExam.findById(id)
      .populate('student')
      .populate('exam');
    
    if (!studentExam) {
      return res.status(404).json({
        message: 'Student exam not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this student exam
    if (user && user.userType === 'student' && user.id) {
      if (studentExam.student._id.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view your own student exams.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Student exam retrieved successfully',
      data: studentExam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student exam:', error);
    res.status(500).json({
      message: 'Error retrieving student exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new student exam
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { student, exam, startedAt, submittedAt, score } = req.body;
    
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
    
    // If user is a student, they can only create exams for themselves
    if (user && user.userType === 'student' && user.id) {
      if (student !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only create exams for yourself.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!student || !exam) {
      return res.status(400).json({
        message: 'Student and exam are required',
        status: 'error'
      });
    }
    
    // Check if student exam with this student and exam already exists
    const existingStudentExam = await StudentExam.findOne({ student, exam });
    
    if (existingStudentExam) {
      return res.status(400).json({
        message: 'A student exam with this student and exam already exists',
        status: 'error'
      });
    }
    
    // Create new student exam
    const studentExam = new StudentExam({
      student,
      exam,
      startedAt: startedAt || new Date(),
      submittedAt,
      score
    });
    
    await studentExam.save();
    
    // Populate the response with referenced data
    const savedStudentExam = await StudentExam.findById(studentExam._id)
      .populate('student')
      .populate('exam');
    
    res.status(201).json({
      message: 'Student exam created successfully',
      data: savedStudentExam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating student exam:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A student exam with this student and exam already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating student exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Calculate score for student exam
router.post('/:id/calculate-score', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid student exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid student exam ID format',
        status: 'error'
      });
    }
    
    // Calculate the score
    const score = await calculateStudentExamScore(id);
    
    // Get the updated student exam
    const updatedStudentExam = await StudentExam.findById(id)
      .populate('student')
      .populate('exam');
    
    res.json({
      message: 'Score calculated successfully',
      data: {
        ...updatedStudentExam.toObject(),
        score
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    
    res.status(500).json({
      message: 'Error calculating score',
      error: error.message,
      status: 'error'
    });
  }
});

// Update student exam by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startedAt, submittedAt, score } = req.body;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid student exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid student exam ID format',
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
    
    // Find the student exam
    const studentExam = await StudentExam.findById(id);
    if (!studentExam) {
      return res.status(404).json({
        message: 'Student exam not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this student exam
    if (user && user.userType === 'student' && user.id) {
      if (studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only update your own student exams.',
          status: 'error'
        });
      }
    }
    
    // Update the student exam
    const updateData = {};
    if (startedAt !== undefined) updateData.startedAt = startedAt;
    if (submittedAt !== undefined) updateData.submittedAt = submittedAt;
    if (score !== undefined) updateData.score = score;
    
    const updatedStudentExam = await StudentExam.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('student').populate('exam');
    
    res.json({
      message: 'Student exam updated successfully',
      data: updatedStudentExam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating student exam:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A student exam with this student and exam already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating student exam',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete student exam by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid student exam ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid student exam ID format',
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
    
    // Find the student exam
    const studentExam = await StudentExam.findById(id);
    if (!studentExam) {
      return res.status(404).json({
        message: 'Student exam not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this student exam
    if (user && user.userType === 'student' && user.id) {
      if (studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only delete your own student exams.',
          status: 'error'
        });
      }
    }
    
    // Delete the student exam
    await StudentExam.findByIdAndDelete(id);
    
    res.json({
      message: 'Student exam deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting student exam:', error);
    res.status(500).json({
      message: 'Error deleting student exam',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
import express from 'express';
import Question from '../Question.js';
import Exam from '../Exam.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all questions (with teacher filtering for teachers)
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
    
    // Support filtering by exam
    if (req.query.exam) {
      // Validate that the exam ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.exam)) {
        return res.status(400).json({
          message: 'Invalid exam ID format',
          status: 'error'
        });
      }
      query.exam = req.query.exam;
    }
    
    // If user is a teacher, only show questions from exams they created
    if (user && user.userType === 'teacher' && user.teacherId) {
      // First get exams created by this teacher
      const exams = await Exam.find({ teacher: user.teacherId });
      const examIds = exams.map(exam => exam._id);
      
      // Combine with existing query
      if (query.exam) {
        // If specific exam is requested, check if it's one of the teacher's exams
        if (!examIds.includes(query.exam)) {
          return res.status(403).json({
            message: 'Access denied. You can only view questions from exams you created.',
            status: 'error'
          });
        }
        // If it is, keep the existing query
      } else {
        // No specific exam requested, show all teacher's exams
        query.exam = { $in: examIds };
      }
    }
    // If user is a student, they can only see questions from exams they have access to
    else if (user && user.userType === 'student') {
      // For students, we still allow filtering by exam (this is used in exam taking)
      // The exam availability check should be done at the exam level, not question level
    }
    
    const questions = await Question.find(query).populate('exam').sort({ createdAt: -1 });
    
    res.json({
      message: 'Questions retrieved successfully',
      data: questions,
      count: questions.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      message: 'Error retrieving questions',
      error: error.message,
      status: 'error'
    });
  }
});

// Get question by ID (with teacher filtering for teachers)
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
    
    const question = await Question.findById(id).populate('exam');
    
    if (!question) {
      return res.status(404).json({
        message: 'Question not found',
        status: 'error'
      });
    }
    
    // If user is a teacher, check if they have access to this question
    if (user && user.userType === 'teacher' && user.teacherId) {
      const exam = await Exam.findById(question.exam);
      if (exam && exam.teacher.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only view questions from exams you created.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Question retrieved successfully',
      data: question,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      message: 'Error retrieving question',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new question
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { exam, questionText, optionA, optionB, optionC, optionD, correctOption } = req.body;
    
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
      const examDoc = await Exam.findById(exam);
      if (examDoc && examDoc.teacher.toString() !== user.teacherId) {
        return res.status(403).json({
          message: 'Access denied. You can only create questions for exams you created.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!exam || !questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate correctOption
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({
        message: 'Correct option must be one of A, B, C, or D',
        status: 'error'
      });
    }
    
    // Check if question with this exam and questionText already exists
    const existingQuestion = await Question.findOne({ exam, questionText });
    
    if (existingQuestion) {
      return res.status(400).json({
        message: 'A question with this text already exists for this exam',
        status: 'error'
      });
    }
    
    // Create new question
    const question = new Question({
      exam,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption
    });
    
    await question.save();
    
    // Populate the response with referenced data
    const savedQuestion = await Question.findById(question._id).populate('exam');
    
    res.status(201).json({
      message: 'Question created successfully',
      data: savedQuestion,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating question:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A question with this text already exists for this exam',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating question',
      error: error.message,
      status: 'error'
    });
  }
});

// Update question by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { exam, questionText, optionA, optionB, optionC, optionD, correctOption } = req.body;
    
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
    
    // If user is a teacher, check if they have access to this question
    if (user && user.userType === 'teacher' && user.teacherId) {
      const question = await Question.findById(id);
      if (question) {
        const examDoc = await Exam.findById(question.exam);
        if (examDoc && examDoc.teacher.toString() !== user.teacherId) {
          return res.status(403).json({
            message: 'Access denied. You can only update questions from exams you created.',
            status: 'error'
          });
        }
      }
      
      // Also check access to the new exam if it's being changed
      if (exam !== question.exam.toString()) {
        const examDoc = await Exam.findById(exam);
        if (examDoc && examDoc.teacher.toString() !== user.teacherId) {
          return res.status(403).json({
            message: 'Access denied. You can only update questions to exams you created.',
            status: 'error'
          });
        }
      }
    }
    
    // Validate required fields
    if (!exam || !questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate correctOption
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({
        message: 'Correct option must be one of A, B, C, or D',
        status: 'error'
      });
    }
    
    // Check if another question with this exam and questionText already exists
    const existingQuestion = await Question.findOne({
      exam,
      questionText,
      _id: { $ne: id }
    });
    
    if (existingQuestion) {
      return res.status(400).json({
        message: 'A question with this text already exists for this exam',
        status: 'error'
      });
    }
    
    const question = await Question.findByIdAndUpdate(
      id,
      {
        exam,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption
      },
      { new: true, runValidators: true }
    ).populate('exam');
    
    if (!question) {
      return res.status(404).json({
        message: 'Question not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Question updated successfully',
      data: question,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating question:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A question with this text already exists for this exam',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating question',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete question by ID
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
    
    // If user is a teacher, check if they have access to this question
    if (user && user.userType === 'teacher' && user.teacherId) {
      const question = await Question.findById(id);
      if (question) {
        const exam = await Exam.findById(question.exam);
        if (exam && exam.teacher.toString() !== user.teacherId) {
          return res.status(403).json({
            message: 'Access denied. You can only delete questions from exams you created.',
            status: 'error'
          });
        }
      }
    }
    
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      return res.status(404).json({
        message: 'Question not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Question deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      message: 'Error deleting question',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
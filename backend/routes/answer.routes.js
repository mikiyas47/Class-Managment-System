import express from 'express';
import mongoose from 'mongoose';
import Answer from '../Answer.js';
import StudentExam from '../StudentExam.js';
import Question from '../Question.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all answers (with student filtering for students)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user information from the authenticated request
    const user = req.user;
    console.log('User info:', user);
    
    console.log('Fetching answers with query params:', req.query);
    console.log('User info:', user);
    
    let query = {};
    
    // Support filtering by studentExam and question
    if (req.query.studentExam) {
      console.log('Filtering by studentExam:', req.query.studentExam);
      // Validate that the studentExam ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.studentExam)) {
        console.log('Invalid student exam ID format:', req.query.studentExam);
        return res.status(400).json({
          message: 'Invalid student exam ID format',
          status: 'error'
        });
      }
      query.studentExam = new mongoose.Types.ObjectId(req.query.studentExam);
    }
    
    if (req.query.question) {
      console.log('Filtering by question:', req.query.question);
      // Validate that the question ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.question)) {
        console.log('Invalid question ID format:', req.query.question);
        return res.status(400).json({
          message: 'Invalid question ID format',
          status: 'error'
        });
      }
      query.question = new mongoose.Types.ObjectId(req.query.question);
    }
    
    console.log('Query object before user check:', query);
    
    // If user is a student, only show answers from their student exams
    if (user && user.userType === 'student' && user.id) {
      console.log('User is student, applying student restrictions');
      try {
        // First get student exams for this student
        const studentExams = await StudentExam.find({ student: user.id });
        const studentExamIds = studentExams.map(se => se._id);
        
        console.log('Student exam IDs (as ObjectId):', studentExamIds);
        
        // Convert to strings for comparison
        const studentExamIdStrings = studentExamIds.map(id => id.toString());
        console.log('Student exam IDs (as strings):', studentExamIdStrings);
        
        // Combine with existing filters
        if (query.studentExam) {
          // If specific studentExam is requested, check if it's one of the student's exams
          const studentExamIdStr = query.studentExam.toString();
          if (studentExamIdStrings.includes(studentExamIdStr)) {
            query.studentExam = query.studentExam; // Keep the filter
            console.log('Student has access to requested student exam');
          } else {
            // Student doesn't have access to this student exam
            console.log('Student does not have access to requested student exam');
            return res.status(403).json({
              message: 'Access denied. You can only view answers from your own exams.',
              status: 'error'
            });
          }
        } else {
          // No specific studentExam requested, show all student's exams
          query.studentExam = { $in: studentExamIds };
          console.log('Filtering by student exam IDs (as ObjectIds)');
        }
      } catch (studentExamError) {
        console.error('Error fetching student exams:', studentExamError);
        return res.status(500).json({
          message: 'Error retrieving student exams',
          error: studentExamError.message,
          status: 'error'
        });
      }
    } else if (user && user.userType === 'teacher') {
      console.log('User is teacher, no restrictions applied');
      // Teachers have full access, no additional filtering needed
    } else {
      console.log('User type not recognized for access control');
    }
    
    console.log('Final query object:', query);
    
    // Try to find answers
    console.log('Executing Answer.find with query');
    try {
      const answers = await Answer.find(query)
        .populate('studentExam')
        .populate('question')
        .sort({ createdAt: -1 });
      
      console.log('Found answers:', answers.length);
      
      res.json({
        message: 'Answers retrieved successfully',
        data: answers,
        count: answers.length,
        status: 'success'
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        message: 'Database error while retrieving answers',
        error: dbError.message,
        status: 'error'
      });
    }
  } catch (error) {
    console.error('Error fetching answers:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Error retrieving answers',
      error: error.message,
      status: 'error'
    });
  }
});

// Get answer by ID (with student filtering for students)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid answer ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid answer ID format',
        status: 'error'
      });
    }
    
    // Get user information from the authenticated request
    const user = req.user;
    
    console.log('Getting answer by ID:', id);
    console.log('User info:', user);
    
    const answer = await Answer.findById(id)
      .populate('studentExam')
      .populate('question');
    
    if (!answer) {
      return res.status(404).json({
        message: 'Answer not found',
        status: 'error'
      });
    }
    
    console.log('Found answer:', answer);
    
    // If user is a student, check if they have access to this answer
    if (user && user.userType === 'student' && user.id) {
      console.log('User is student, checking access');
      const studentExam = await StudentExam.findById(answer.studentExam);
      if (studentExam && studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view your own answers.',
          status: 'error'
        });
      }
    } else if (user && user.userType === 'teacher') {
      console.log('User is teacher, access granted');
      // Teachers have full access, no additional filtering needed
    }
    
    res.json({
      message: 'Answer retrieved successfully',
      data: answer,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching answer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Error retrieving answer',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new answer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { studentExam, question, selectedOption } = req.body;
    
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
    
    // If user is a student, check if they have access to this student exam
    if (user && user.userType === 'student' && user.id) {
      const studentExamDoc = await StudentExam.findById(studentExam);
      if (studentExamDoc && studentExamDoc.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only create answers for your own exams.',
          status: 'error'
        });
      }
    }
    
    // Validate required fields
    if (!studentExam || !question || !selectedOption) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate selectedOption
    if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
      return res.status(400).json({
        message: 'Selected option must be one of A, B, C, or D',
        status: 'error'
      });
    }
    
    // Check if answer with this studentExam and question already exists
    const existingAnswer = await Answer.findOne({ studentExam, question });
    
    if (existingAnswer) {
      // If answer exists, update it instead of throwing an error
      existingAnswer.selectedOption = selectedOption;
      await existingAnswer.save();
      
      // Populate the response with referenced data
      const updatedAnswer = await Answer.findById(existingAnswer._id)
        .populate('studentExam')
        .populate('question');
      
      return res.json({
        message: 'Answer updated successfully',
        data: updatedAnswer,
        status: 'success'
      });
    }
    
    // Verify that the question exists
    const questionDoc = await Question.findById(question);
    if (!questionDoc) {
      return res.status(400).json({
        message: 'Question not found',
        status: 'error'
      });
    }
    
    // Verify that the student exam exists
    const studentExamDoc = await StudentExam.findById(studentExam);
    if (!studentExamDoc) {
      return res.status(400).json({
        message: 'Student exam not found',
        status: 'error'
      });
    }
    
    // Create new answer
    const answer = new Answer({
      studentExam,
      question,
      selectedOption
    });
    
    await answer.save();
    
    // Populate the response with referenced data
    const savedAnswer = await Answer.findById(answer._id)
      .populate('studentExam')
      .populate('question');
    
    res.status(201).json({
      message: 'Answer created successfully',
      data: savedAnswer,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating answer:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An answer for this question already exists for this exam',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating answer',
      error: error.message,
      status: 'error'
    });
  }
});

// Update answer by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedOption } = req.body;
    
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
    
    // Validate required fields
    if (!selectedOption) {
      return res.status(400).json({
        message: 'Selected option is required',
        status: 'error'
      });
    }
    
    // Validate selectedOption
    if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
      return res.status(400).json({
        message: 'Selected option must be one of A, B, C, or D',
        status: 'error'
      });
    }
    
    // Find the answer
    const answer = await Answer.findById(id);
    if (!answer) {
      return res.status(404).json({
        message: 'Answer not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this answer
    if (user && user.userType === 'student' && user.id) {
      const studentExam = await StudentExam.findById(answer.studentExam);
      if (studentExam && studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only update your own answers.',
          status: 'error'
        });
      }
    }
    
    // Update the answer
    answer.selectedOption = selectedOption;
    await answer.save();
    
    // Populate the response with referenced data
    const savedAnswer = await Answer.findById(answer._id)
      .populate('studentExam')
      .populate('question');
    
    res.json({
      message: 'Answer updated successfully',
      data: savedAnswer,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating answer:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An answer for this question already exists for this exam',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating answer',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete answer by ID
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
    
    // Find the answer
    const answer = await Answer.findById(id);
    if (!answer) {
      return res.status(404).json({
        message: 'Answer not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this answer
    if (user && user.userType === 'student' && user.id) {
      const studentExam = await StudentExam.findById(answer.studentExam);
      if (studentExam && studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only delete your own answers.',
          status: 'error'
        });
      }
    }
    
    // Delete the answer
    await Answer.findByIdAndDelete(id);
    
    res.json({
      message: 'Answer deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting answer:', error);
    res.status(500).json({
      message: 'Error deleting answer',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
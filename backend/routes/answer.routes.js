import express from 'express';
import Answer from '../Answer.js';
import StudentExam from '../StudentExam.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all answers (with student filtering for students)
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
    
    // If user is a student, only show answers from their student exams
    if (user && user.userType === 'student' && user.id) {
      try {
        // First get student exams for this student
        const studentExams = await StudentExam.find({ student: user.id });
        const studentExamIds = studentExams.map(se => se._id);
        
        console.log('Student exams found:', studentExams);
        
        // If specific studentExam is requested, check if it's one of the student's exams
        if (req.query.studentExam) {
          const requestedStudentExamId = req.query.studentExam;
          
          // Validate the requested student exam ID format
          if (!/^[0-9a-fA-F]{24}$/.test(requestedStudentExamId)) {
            console.log('Invalid student exam ID format:', req.query.studentExam);
            return res.status(400).json({
              message: 'Invalid student exam ID format',
              status: 'error'
            });
          }
          
          if (studentExamIds.includes(mongoose.Types.ObjectId(requestedStudentExamId))) {
            console.log('Student has access to requested student exam');
            query.studentExam = requestedStudentExamId;
          } else {
            // Student doesn't have access to this student exam
            console.log('Student does not have access to requested student exam');
            return res.status(403).json({
              message: 'Access denied. You do not have access to this student exam.',
              status: 'error'
            });
          }
        } else {
          // No specific studentExam requested, show all student's exams
          if (studentExamIds.length > 0) {
            console.log('Filtering by student exam IDs (as ObjectIds)');
            query.studentExam = { $in: studentExamIds.map(id => mongoose.Types.ObjectId(id)) };
          } else {
            // Student has no exams, return empty array
            console.log('Student has no exams');
            return res.json({
              message: 'Answers retrieved successfully',
              data: [],
              count: 0,
              status: 'success'
            });
          }
        }
      } catch (studentExamError) {
        console.error('Error fetching student exams:', studentExamError);
        return res.status(500).json({
          message: 'Error retrieving student exams',
          error: studentExamError.message,
          status: 'error'
        });
      }
    } else {
      // For non-students (teachers, admins), filter by studentExam if provided
      if (req.query.studentExam) {
        query.studentExam = req.query.studentExam;
      }
    }
    
    console.log('Answer query:', query);
    
    const answers = await Answer.find(query)
      .populate('studentExam')
      .populate('question')
      .sort({ createdAt: -1 });
    
    console.log('Answers found:', answers.length);
    
    res.json({
      message: 'Answers retrieved successfully',
      data: answers,
      count: answers.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching answers:', error);
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
    
    const answer = await Answer.findById(id)
      .populate('studentExam')
      .populate('question');
    
    if (!answer) {
      return res.status(404).json({
        message: 'Answer not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this answer
    if (user && user.userType === 'student' && user.id) {
      if (answer.studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view your own answers.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Answer retrieved successfully',
      data: answer,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching answer:', error);
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
    
    // Validate required fields
    if (!studentExam || !question || !selectedOption) {
      return res.status(400).json({
        message: 'Student exam, question, and selected option are required',
        status: 'error'
      });
    }
    
    // Verify that the student exam exists
    const studentExamDoc = await StudentExam.findById(studentExam);
    if (!studentExamDoc) {
      return res.status(400).json({
        message: 'Invalid student exam ID',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this student exam
    if (user && user.userType === 'student' && user.id) {
      if (studentExamDoc.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only create answers for your own exams.',
          status: 'error'
        });
      }
    }
    
    // Check if answer with this student exam and question already exists
    const existingAnswer = await Answer.findOne({ studentExam, question });
    
    if (existingAnswer) {
      return res.status(400).json({
        message: 'An answer with this student exam and question already exists',
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
        message: 'An answer with this student exam and question already exists',
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
      if (answer.studentExam.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only update your own answers.',
          status: 'error'
        });
      }
    }
    
    // Update the answer
    const updateData = {};
    if (selectedOption !== undefined) updateData.selectedOption = selectedOption;
    
    const updatedAnswer = await Answer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('studentExam').populate('question');
    
    res.json({
      message: 'Answer updated successfully',
      data: updatedAnswer,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating answer:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An answer with this student exam and question already exists',
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
      if (answer.studentExam.student.toString() !== user.id) {
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
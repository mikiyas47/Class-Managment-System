import express from 'express';
import mongoose from 'mongoose';
import StudentExam from '../StudentExam.js';
import Answer from '../Answer.js';
import Question from '../Question.js';
import Exam from '../Exam.js';
import Result from '../Result.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all student exams (with student filtering for students)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user information from the authenticated request
    const user = req.user;
    
    let query = {};
    
    // Support filtering by student and exam
    if (req.query.student) {
      // Validate that the student ID is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.student)) {
        return res.status(400).json({
          message: 'Invalid student ID format',
          status: 'error'
        });
      }
      query.student = req.query.student;
    }
    
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
    
    // If user is a student, only show exams for that student
    if (user && user.userType === 'student' && user.id) {
      // Combine with existing filters
      if (query.student) {
        // If specific student is requested, check if it's the current student
        if (query.student !== user.id) {
          return res.status(403).json({
            message: 'Access denied. You can only view your own exams.',
            status: 'error'
          });
        }
      } else {
        // No specific student requested, show only current student's exams
        query.student = user.id;
      }
    }
    // If user is a teacher, they can access all student exams (no additional filtering needed)
    // Teachers have full access to view student exams for courses they teach
    
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
    
    // Get user information from the authenticated request
    const user = req.user;
    
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
          message: 'Access denied. You can only view your own exams.',
          status: 'error'
        });
      }
    }
    // If user is a teacher, they can access all student exams (no additional filtering needed)
    // Teachers have full access to view student exams for courses they teach
    
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
    const { student, exam } = req.body;
    
    // Get user information from the authenticated request
    const user = req.user;
    
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
    
    // Check if student exam already exists
    const existingStudentExam = await StudentExam.findOne({ student, exam });
    
    if (existingStudentExam) {
      // If student exam exists, return it instead of throwing an error
      const populatedStudentExam = await StudentExam.findById(existingStudentExam._id)
        .populate('student')
        .populate('exam');
      
      return res.json({
        message: 'Student exam retrieved successfully',
        data: populatedStudentExam,
        status: 'success'
      });
    }
    
    // Create new student exam
    const studentExam = new StudentExam({
      student,
      exam,
      startedAt: new Date()
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
        message: 'This student exam already exists',
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

// Update student exam by ID
router.put('/:id', authenticateToken, async (req, res) => {
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
    const { submittedAt, score } = req.body;
    
    // Get user information from the authenticated request
    const user = req.user;
    
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
          message: 'Access denied. You can only update your own exams.',
          status: 'error'
        });
      }
    }
    
    // Update the student exam
    const updateData = {};
    if (submittedAt !== undefined) updateData.submittedAt = submittedAt;
    if (score !== undefined) updateData.score = score;
    
    // If this is a submission (submittedAt is being set) and score is not provided,
    // calculate the score automatically as the number of correct answers
    if (submittedAt !== undefined && score === undefined) {
      // Add multiple delays to ensure all WebSocket answers are saved
      console.log('Waiting for answers to be saved...');
      await new Promise(resolve => setTimeout(resolve, 500)); // First wait
      await new Promise(resolve => setTimeout(resolve, 500)); // Second wait
      await new Promise(resolve => setTimeout(resolve, 500)); // Third wait
      console.log('Finished waiting for answers to be saved');
      
      // Fetch all answers for this student exam with proper population
      const answers = await Answer.find({ studentExam: id })
        .populate({
          path: 'question',
          select: '_id correctOption exam'
        });
      
      // Fetch all questions for this exam to get correct answers
      const questions = await Question.find({ exam: studentExam.exam });
      
      // Log for debugging
      console.log('Score calculation debug info:', {
        studentExamId: id,
        examId: studentExam.exam,
        answersCount: answers.length,
        questionsCount: questions.length,
        answers: answers.map(a => ({
          id: a._id,
          studentExam: a.studentExam,
          question: a.question ? (a.question._id || a.question) : null,
          selectedOption: a.selectedOption
        })),
        questions: questions.map(q => ({
          id: q._id,
          exam: q.exam,
          correctOption: q.correctOption
        }))
      });
      
      // Create a map of question ID to correct option
      const correctAnswers = {};
      questions.forEach(question => {
        const questionId = question._id.toString();
        correctAnswers[questionId] = question.correctOption;
      });
      
      // Calculate score as the number of correct answers
      let correctCount = 0;
      answers.forEach(answer => {
        // Make sure we have a valid question reference
        if (answer.question) {
          // Handle both populated and non-populated question references
          const questionId = answer.question._id ? answer.question._id.toString() : answer.question.toString();
          
          // Check if this question ID exists in our correct answers map
          if (correctAnswers[questionId]) {
            console.log(`Comparing answer for question ${questionId}: student=${answer.selectedOption}, correct=${correctAnswers[questionId]}`);
            if (answer.selectedOption === correctAnswers[questionId]) {
              correctCount++;
              console.log(`Correct answer found! Count now: ${correctCount}`);
            }
          } else {
            console.log(`Question ${questionId} not found in correct answers map`);
          }
        } else {
          console.log(`Answer ${answer._id} has no question reference`);
        }
      });
      
      // Set score as the number of correct answers (not percentage)
      updateData.score = correctCount;
      
      // Log final result
      console.log('Final score calculation:', {
        totalQuestions: questions.length,
        correctCount,
        score: correctCount // Store as raw count, not percentage
      });
    }
    
    const updatedStudentExam = await StudentExam.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('student').populate('exam');
    
    // Update result if this is a submission with a score
    if (submittedAt !== undefined && updateData.score !== undefined) {
      try {
        // Find the exam to get the course and class
        const exam = await Exam.findById(updatedStudentExam.exam);
        if (exam) {
          // Find or create result for this student and course
          const resultData = {
            student: updatedStudentExam.student,
            course: exam.course,
            class: exam.class
          };
          
          // Set the appropriate score based on exam title
          if (exam.title === 'Mid-exam') {
            resultData.midExamScore = updateData.score;
          } else if (exam.title === 'Final-exam') {
            resultData.finalExamScore = updateData.score;
          }
          
          // Calculate overall score and grade
          // First, get existing result to preserve other scores
          const existingResult = await Result.findOne({
            student: updatedStudentExam.student,
            course: exam.course
          });
          
          if (existingResult) {
            // Update existing result
            if (exam.title === 'Mid-exam') {
              existingResult.midExamScore = updateData.score;
            } else if (exam.title === 'Final-exam') {
              existingResult.finalExamScore = updateData.score;
            }
            
            // Recalculate overall score
            let overallScore = null;
            if (existingResult.midExamScore !== null && existingResult.finalExamScore !== null) {
              // Example: 30% mid-exam, 50% final-exam, 20% assignment
              overallScore = Math.round((existingResult.midExamScore * 0.3) + (existingResult.finalExamScore * 0.5) + ((existingResult.assignmentScore || 0) * 0.2));
            } else if (existingResult.midExamScore !== null) {
              overallScore = Math.round(existingResult.midExamScore * 0.6);
            } else if (existingResult.finalExamScore !== null) {
              overallScore = Math.round(existingResult.finalExamScore * 0.8);
            }
            
            existingResult.overallScore = overallScore;
            
            // Determine grade
            let grade = null;
            if (overallScore !== null) {
              if (overallScore >= 90) grade = 'A+';
              else if (overallScore >= 85) grade = 'A';
              else if (overallScore >= 80) grade = 'A-';
              else if (overallScore >= 75) grade = 'B+';
              else if (overallScore >= 70) grade = 'B';
              else if (overallScore >= 65) grade = 'B-';
              else if (overallScore >= 60) grade = 'C+';
              else if (overallScore >= 50) grade = 'C';
              else if (overallScore >= 45) grade = 'C-';
              else if (overallScore >= 40) grade = 'D';
              else grade = 'F';
            }
            
            existingResult.grade = grade;
            await existingResult.save();
          } else {
            // Create new result
            const newResult = new Result(resultData);
            await newResult.save();
          }
        }
      } catch (resultError) {
        console.error('Error updating result:', resultError);
      }
    }
    
    res.json({
      message: 'Student exam updated successfully',
      data: updatedStudentExam,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating student exam:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'This student exam already exists',
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
    
    // Get user information from the authenticated request
    const user = req.user;
    
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
          message: 'Access denied. You can only delete your own exams.',
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
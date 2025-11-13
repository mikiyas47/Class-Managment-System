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

// Helper function to calculate student exam score with weighted questions
export const calculateStudentExamScore = async (studentExamId) => {
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
      // Update student exam with calculated score and max score
      studentExam.score = 0;
      studentExam.maxScore = 0;
      await studentExam.save();
      return 0;
    }
    
    // Get all questions for this exam
    const questions = await Question.find({ exam: studentExam.exam._id });
    
    console.log(`Found ${questions.length} total questions for exam ${studentExam.exam._id}`);
    console.log(`Evaluating only the ${answers.length} questions that were answered by the student`);
    
    // Calculate weighted score based on answered questions
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    // For each answer, check if it's correct and add the question weight to the score
    answers.forEach(answer => {
      const question = questions.find(q => q._id.toString() === answer.question._id.toString());
      if (question) {
        // Add the question's weight to the max possible score (only for answered questions)
        maxPossibleScore += question.weight;
        
        // If the answer is correct, add the question's weight to the total score
        if (answer.selectedOption === question.correctOption) {
          totalScore += question.weight;
        }
      }
    });
    
    // Calculate total exam weight (sum of all question weights)
    let totalExamWeight = 0;
    questions.forEach(question => {
      totalExamWeight += question.weight;
    });
    
    // Update student exam with calculated score and max score
    studentExam.score = totalScore;
    studentExam.maxScore = maxPossibleScore;
    await studentExam.save();
    
    console.log(`Calculated weighted score for student exam ${studentExamId}: ${totalScore} out of ${maxPossibleScore} (Total exam weight: ${totalExamWeight})`);
    
    // Update the results table with the new score
    try {
      // Import required models
      const Result = (await import('../Result.js')).default;
      const Exam = (await import('../Exam.js')).default;
      
      // Get the student and course information from the student exam
      const exam = await Exam.findById(studentExam.exam);
      if (!exam) {
        console.log('Exam not found, skipping result update');
        return totalScore;
      }
      
      const studentId = studentExam.student;
      const courseId = exam.course;
      const classId = exam.class;
      
      console.log(`Updating results for student ${studentId}, course ${courseId}`);
      
      // Find existing result for this student and course
      const existingResult = await Result.findOne({ student: studentId, course: courseId });
      
      // Prepare update data based on exam title
      const updateData = {};
      if (exam.title === 'Mid-exam') {
        updateData.midExamScore = totalScore;
        updateData.midExamMaxScore = totalExamWeight; // Add max score
      } else if (exam.title === 'Final-exam') {
        updateData.finalExamScore = totalScore;
        updateData.finalExamMaxScore = totalExamWeight; // Add max score
      }

      // If result exists, update it
      if (existingResult) {
        // Update the specific exam score
        const updatedResult = await Result.findByIdAndUpdate(
          existingResult._id,
          updateData,
          { new: true, runValidators: true }
        );
        
        // Recalculate overall score and grade
        let overallScore = 0;
        let totalMaxScore = 0;

        if (updatedResult.midExamScore !== null) overallScore += updatedResult.midExamScore;
        if (updatedResult.finalExamScore !== null) overallScore += updatedResult.finalExamScore;
        if (updatedResult.assignmentScore !== null) overallScore += updatedResult.assignmentScore;

        if (updatedResult.midExamMaxScore !== null) totalMaxScore += updatedResult.midExamMaxScore;
        if (updatedResult.finalExamMaxScore !== null) totalMaxScore += updatedResult.finalExamMaxScore;

        // Update overall score
        updatedResult.overallScore = overallScore;

        // Recalculate grade based on overall score directly
        // No division by max scores as per requirements
        const percentage = overallScore;

        // Ensure we're working with numbers for comparison
        const score = Number(percentage);
        
        if (score >= 90) updatedResult.grade = 'A+';
        else if (score >= 85) updatedResult.grade = 'A';
        else if (score >= 80) updatedResult.grade = 'A-';
        else if (score >= 75) updatedResult.grade = 'B+';
        else if (score >= 70) updatedResult.grade = 'B';
        else if (score >= 65) updatedResult.grade = 'B-';
        else if (score >= 60) updatedResult.grade = 'C+';
        else if (score >= 50) updatedResult.grade = 'C';
        else if (score >= 45) updatedResult.grade = 'C-';
        else if (score >= 40) updatedResult.grade = 'D';
        else updatedResult.grade = 'F';

        await updatedResult.save();
        console.log(`Updated existing result with new scores:`, updateData);
      } else {
        // Create new result if it doesn't exist
        // Ensure we're working with numbers for comparison
        const score = Number(totalScore);
        const resultData = {
          student: studentId,
          course: courseId,
          class: classId,
          overallScore: totalScore,
          grade: score >= 90 ? 'A+' : 
            score >= 85 ? 'A' : 
            score >= 80 ? 'A-' : 
            score >= 75 ? 'B+' : 
            score >= 70 ? 'B' : 
            score >= 65 ? 'B-' : 
            score >= 60 ? 'C+' : 
            score >= 50 ? 'C' : 
            score >= 45 ? 'C-' : 
            score >= 40 ? 'D' : 'F'
        };
        
        // Set the specific exam score and max score
        if (exam.title === 'Mid-exam') {
          resultData.midExamScore = totalScore;
          resultData.midExamMaxScore = totalExamWeight; // Add max score
        } else if (exam.title === 'Final-exam') {
          resultData.finalExamScore = totalScore;
          resultData.finalExamMaxScore = totalExamWeight; // Add max score
        }
        
        const newResult = new Result(resultData);
        await newResult.save();
        console.log(`Created new result with scores:`, resultData);
      }
    } catch (resultError) {
      console.error('Error updating results table:', resultError);
      // Don't fail the score calculation if result update fails
    }
    
    return totalScore;
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
    
    // If score was updated, recalculate the score and update results
    if (score !== undefined) {
      await calculateStudentExamScore(id);
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
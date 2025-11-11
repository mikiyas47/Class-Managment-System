import express from 'express';
import Result from '../Result.js';
import StudentExam from '../StudentExam.js';
import Exam from '../Exam.js';
import Course from '../Course.js';
import Assignment from '../Assignment.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Test endpoint to check if route is accessible

// Get all results
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
    
    // If user is a student, only show results for that student
    if (user && user.userType === 'student' && user.id) {
      query = { student: user.id };
    }
    
    // If filtering by course (for teachers)
    if (req.query.course) {
      query.course = req.query.course;
    }
    
    const results = await Result.find(query)
      .populate('student')
      .populate('course')
      .populate('class')
      .sort({ createdAt: -1 });
    
    res.json({
      message: 'Results retrieved successfully',
      data: results,
      count: results.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      message: 'Error retrieving results',
      error: error.message,
      status: 'error'
    });
  }
});

// Get results for courses taught by a specific teacher
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
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
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!teacherId || teacherId === 'undefined' || teacherId === 'null' || teacherId.trim() === '') {
      return res.status(400).json({
        message: 'Invalid teacher ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        message: 'Invalid teacher ID format',
        status: 'error'
      });
    }
    
    // First get courses taught by this teacher
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(course => course._id.toString());
    
    // Then get results for these courses
    const query = { course: { $in: courseIds } };
    
    // If filtering by specific course
    if (req.query.course) {
      const courseId = req.query.course.toString();
      if (courseIds.includes(courseId)) {
        query.course = courseId;
      } else {
        // Teacher doesn't teach this course
        return res.status(403).json({
          message: 'Access denied. You do not teach this course.',
          status: 'error'
        });
      }
    }
    
    const results = await Result.find(query)
      .populate('student')
      .populate('course')
      .populate('class')
      .sort({ createdAt: -1 });
    
    res.json({
      message: 'Results retrieved successfully',
      data: results,
      count: results.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching teacher results:', error);
    res.status(500).json({
      message: 'Error retrieving results',
      error: error.message,
      status: 'error'
    });
  }
});

// Get result by ID (with student filtering for students)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid result ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid result ID format',
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
    
    const result = await Result.findById(id)
      .populate('student')
      .populate('course')
      .populate('class');
    
    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this result
    if (user && user.userType === 'student' && user.id) {
      if (result.student._id.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view your own results.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Result retrieved successfully',
      data: result,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({
      message: 'Error retrieving result',
      error: error.message,
      status: 'error'
    });
  }
});

// Create or update result based on student exams and assignments
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    console.log('=== RESULTS CALCULATE ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { studentId, courseId, classId } = req.body;
    
    // Verify the token to get user information
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
        console.log('User from token:', user);
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    // Validate required fields
    if (!studentId || !courseId || !classId) {
      console.log('Missing required fields:', { studentId, courseId, classId });
      return res.status(400).json({
        message: 'Student, course, and class are required',
        status: 'error'
      });
    }
    
    // If user is a student, they can only calculate results for themselves
    if (user && user.userType === 'student' && user.id) {
      if (studentId !== user.id) {
        console.log('Access denied - student trying to access other student results');
        return res.status(403).json({
          message: 'Access denied. You can only calculate results for yourself.',
          status: 'error'
        });
      }
    }
    
    console.log('Proceeding with result calculation for:', { studentId, courseId, classId });
    
    // Find all exams for this course
    const exams = await Exam.find({ course: courseId });
    console.log('Found exams for course:', exams.map(e => ({ id: e._id, title: e.title })));
    
    // Find student exams for this student and course
    const studentExams = await StudentExam.find({ 
      student: studentId,
      exam: { $in: exams.map(e => e._id) }
    }).populate('exam');
    
    console.log('Found student exams:', studentExams.length);
    console.log('Student exams details:', studentExams.map(se => ({
      examId: se.exam._id,
      examTitle: se.exam.title,
      score: se.score,
      submittedAt: se.submittedAt
    })));
    
    // Calculate scores - now more flexible to handle any exam titles
    let midExamScore = null;
    let finalExamScore = null;
    let otherExamScores = []; // For any other exams
    let totalExamScore = 0; // Sum of all exam scores
    let examCount = 0; // Count of exams with scores
    
    studentExams.forEach(studentExam => {
      // Check if the student exam has a score (even if it's 0)
      if (studentExam.score !== undefined) {
        const examTitle = studentExam.exam.title.toLowerCase();
        console.log(`Processing exam: ${studentExam.exam.title} with score: ${studentExam.score} (type: ${typeof studentExam.score})`);
        
        // More flexible matching for mid-term exams
        if ((examTitle.includes('mid') || examTitle.includes('Mid-exam')) && midExamScore === null) {
          midExamScore = studentExam.score;
          totalExamScore += studentExam.score;
          examCount++;
          console.log(`Set midExamScore to: ${studentExam.score}`);
        } else if ((examTitle.includes('final') || examTitle.includes('Final-exam')) && finalExamScore === null) {
          finalExamScore = studentExam.score;
          totalExamScore += studentExam.score;
          examCount++;
          console.log(`Set finalExamScore to: ${studentExam.score}`);
        } else {
          // Add to other exam scores
          otherExamScores.push(studentExam.score);
          totalExamScore += studentExam.score;
          examCount++;
          console.log(`Added to otherExamScores: ${studentExam.score}`);
        }
      } else {
        console.log(`Skipping exam ${studentExam.exam.title} - no score found`);
      }
    });
    
    console.log(`Total exam score: ${totalExamScore}, Exam count: ${examCount}`);
    console.log(`Mid exam score: ${midExamScore}, Final exam score: ${finalExamScore}`);
    console.log(`Other exam scores:`, otherExamScores);
    
    // For assignment score, we would need to implement assignment submission and grading
    // For now, we'll set it to null
    const assignmentScore = null;
    
    // Calculate overall score (sum of all exam scores)
    let overallScore = null;
    if (examCount > 0) {
      overallScore = totalExamScore; // Using sum instead of average for consistency with previous logic
      console.log(`Calculated overall score: ${overallScore}`);
    }

    // Determine grade based on overall score
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
      console.log(`Assigned grade: ${grade}`);
    }
    
    // Create or update result
    const resultData = {
      student: studentId,
      course: courseId,
      class: classId,
      midExamScore,
      finalExamScore,
      assignmentScore,
      overallScore,
      grade
    };
    
    console.log('Result data to save:', resultData);
    
    // Check if result already exists
    const existingResult = await Result.findOne({ student: studentId, course: courseId });
    
    let savedResult;
    if (existingResult) {
      // Update existing result
      console.log('Updating existing result with ID:', existingResult._id);
      savedResult = await Result.findByIdAndUpdate(
        existingResult._id,
        resultData,
        { new: true, runValidators: true }
      ).populate('student').populate('course').populate('class');
    } else {
      // Create new result
      console.log('Creating new result');
      const result = new Result(resultData);
      savedResult = await result.save();
      savedResult = await Result.findById(savedResult._id)
        .populate('student')
        .populate('course')
        .populate('class');
    }
    
    console.log('Result saved successfully:', savedResult);
    
    res.status(201).json({
      message: 'Result calculated and saved successfully',
      data: savedResult,
      status: 'success'
    });
  } catch (error) {
    console.error('Error calculating result:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A result for this student and course already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error calculating result',
      error: error.message,
      status: 'error'
    });
  }
});

// Update result by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { midExamScore, finalExamScore, assignmentScore, overallScore, grade } = req.body;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid result ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid result ID format',
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
    
    // Find the result
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this result
    if (user && user.userType === 'student' && user.id) {
      if (result.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only update your own results.',
          status: 'error'
        });
      }
    }
    
    // Update the result
    const updateData = {};
    if (midExamScore !== undefined) updateData.midExamScore = midExamScore;
    if (finalExamScore !== undefined) updateData.finalExamScore = finalExamScore;
    if (assignmentScore !== undefined) updateData.assignmentScore = assignmentScore;
    if (grade !== undefined) updateData.grade = grade;
    
    // Recalculate overall score based on updated values
    const currentMidExamScore = midExamScore !== undefined ? midExamScore : result.midExamScore;
    const currentFinalExamScore = finalExamScore !== undefined ? finalExamScore : result.finalExamScore;
    const currentAssignmentScore = assignmentScore !== undefined ? assignmentScore : result.assignmentScore;
    
    // Calculate overall score (simple sum of all scores)
    const scores = [currentMidExamScore, currentFinalExamScore, currentAssignmentScore].filter(score => score !== null);
    if (scores.length > 0) {
      updateData.overallScore = scores.reduce((sum, score) => sum + (score || 0), 0);
    } else {
      updateData.overallScore = null;
    }
    
    // Recalculate grade based on new overall score using the new grading system
    if (updateData.overallScore !== null) {
      if (updateData.overallScore >= 90) updateData.grade = 'A+';
      else if (updateData.overallScore >= 85) updateData.grade = 'A';
      else if (updateData.overallScore >= 80) updateData.grade = 'A-';
      else if (updateData.overallScore >= 75) updateData.grade = 'B+';
      else if (updateData.overallScore >= 70) updateData.grade = 'B';
      else if (updateData.overallScore >= 65) updateData.grade = 'B-';
      else if (updateData.overallScore >= 60) updateData.grade = 'C+';
      else if (updateData.overallScore >= 50) updateData.grade = 'C';
      else if (updateData.overallScore >= 45) updateData.grade = 'C-';
      else if (updateData.overallScore >= 40) updateData.grade = 'D';
      else updateData.grade = 'F';
    } else {
      updateData.grade = null;
    }
    
    const updatedResult = await Result.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('student').populate('course').populate('class');
    
    res.json({
      message: 'Result updated successfully',
      data: updatedResult,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating result:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A result for this student and course already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating result',
      error: error.message,
      status: 'error'
    });
  }
});

// Update result visibility for students
router.put('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisibleToStudent } = req.body;
    
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
    
    // Only teachers can update result visibility
    if (!user || user.userType !== 'teacher') {
      return res.status(403).json({
        message: 'Access denied. Only teachers can update result visibility.',
        status: 'error'
      });
    }
    
    // Find the result
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
        status: 'error'
      });
    }
    
    // Update visibility
    result.isVisibleToStudent = isVisibleToStudent;
    if (isVisibleToStudent) {
      result.madeVisibleBy = user.id;
      result.madeVisibleAt = new Date();
    }
    
    await result.save();
    
    // Populate the response
    const updatedResult = await Result.findById(id)
      .populate('student')
      .populate('course')
      .populate('class')
      .populate('madeVisibleBy', 'name email');
    
    res.json({
      message: `Result ${isVisibleToStudent ? 'made visible' : 'hidden'} to student successfully`,
      data: updatedResult,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating result visibility:', error);
    res.status(500).json({
      message: 'Error updating result visibility',
      error: error.message,
      status: 'error'
    });
  }
});

// Get results for a teacher (all results for courses they teach)
router.get('/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
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
    
    // Only the teacher themselves or admins can access this
    if (user && user.userType === 'teacher' && user.id !== teacherId) {
      return res.status(403).json({
        message: 'Access denied. You can only view results for courses you teach.',
        status: 'error'
      });
    }
    
    // Import Course model
    const Course = (await import('../Course.js')).default;
    
    // Get courses taught by this teacher
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(course => course._id);
    
    // Get results for these courses
    const results = await Result.find({ 
      course: { $in: courseIds }
    })
      .populate('student', 'name userId email')
      .populate('course', 'subject code')
      .populate('class', 'year semester department')
      .populate('madeVisibleBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Results retrieved successfully',
      data: results,
      count: results.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      message: 'Error retrieving results',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete result by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate that the ID is a valid MongoDB ObjectId
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
      return res.status(400).json({
        message: 'Invalid result ID',
        status: 'error'
      });
    }
    
    // Additional validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid result ID format',
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
    
    // Find the result
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
        status: 'error'
      });
    }
    
    // If user is a student, check if they have access to this result
    if (user && user.userType === 'student' && user.id) {
      if (result.student.toString() !== user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only delete your own results.',
          status: 'error'
        });
      }
    }
    
    // Delete the result
    await Result.findByIdAndDelete(id);
    
    res.json({
      message: 'Result deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({
      message: 'Error deleting result',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
import express from 'express';
import Result from '../Result.js';
import Student from '../Student.js';
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

// Get results for a specific student (filtered by enrolled courses)
router.get('/student/:id', authenticateToken, async (req, res) => {
  try {
    const { id: studentId } = req.params;

    // Import required models
    const AddStudent = (await import('../AddStudent.js')).default;

    // Get the student
    const student = await Student.findById(studentId).populate('class');
    
    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
        status: 'error'
      });
    }

    // Get regular courses for the student's class
    let regularCourses = [];
    try {
      regularCourses = await Course.find({ class: student.class._id || student.class });
    } catch (courseError) {
      console.error('Error fetching regular courses:', courseError);
      // Return empty array if there's an error fetching courses
      regularCourses = [];
    }
    
    
    const regularCourseIds = regularCourses.map(course => course._id);

    // Get added courses for this student (including retake courses)
    // Include both 'enrolled' and 'pending' status records
    let addedCoursesRecords = [];
    try {
      addedCoursesRecords = await AddStudent.find({ 
        student: studentId, 
        status: { $in: ['enrolled', 'pending'] } 
      }).populate('course');
    } catch (addStudentError) {
      console.error('Error fetching added courses records:', addStudentError);
      // Return empty array if there's an error fetching added courses
      addedCoursesRecords = [];
    }

    const addedCourseIds = addedCoursesRecords
      .filter(record => record.course) // Filter out records without a course
      .map(record => record.course._id);

    // Combine all course IDs
    const allCourseIds = [...regularCourseIds, ...addedCourseIds];
    
    // If student has no courses, return empty array
    if (allCourseIds.length === 0) {
      return res.json({
        message: 'Results retrieved successfully',
        data: [],
        count: 0,
        status: 'success'
      });
    }

    // Get results for these courses and this student
    // Only return results that are visible to students
    let results = [];
    try {
      results = await Result.find({
        student: studentId,
        course: { $in: allCourseIds },
        isVisibleToStudent: true  // Only fetch results that are made visible by teachers
      })
        .populate({
          path: 'student',
          select: 'name userId email class department'
        })
        .populate({
          path: 'course',
          select: 'subject code teacher department class'
        })
        .populate({
          path: 'class',
          select: 'year semester'
        })
        .sort({ createdAt: -1 });
    } catch (resultError) {
      console.error('Error fetching results:', resultError);
      // Return empty array if there's an error fetching results
      results = [];
    }

    res.json({
      message: 'Results retrieved successfully',
      data: results,
      count: results.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({
      message: 'Error retrieving results',
      error: error.message,
      stack: error.stack, // Include stack trace for debugging
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
      maxScore: se.maxScore,
      submittedAt: se.submittedAt
    })));
    
    // Calculate scores - now more flexible to handle any exam titles
    let midExamScore = null;
    let midExamMaxScore = null;
    let finalExamScore = null;
    let finalExamMaxScore = null;
    let otherExamScores = []; // For any other exams
    let totalExamScore = 0; // Sum of all exam scores
    let examCount = 0; // Count of exams with scores
    
    // We need to fetch questions to calculate max scores properly
    const examIds = studentExams.map(se => se.exam._id);
    const Question = (await import('../Question.js')).default;
    const examQuestions = await Question.find({ exam: { $in: examIds } });
    
    console.log('Found exam questions:', examQuestions.length);
    console.log('Exam IDs:', examIds);
    console.log('Exam questions:', examQuestions.map(q => ({
      exam: q.exam.toString(),
      weight: q.weight,
      questionText: q.questionText.substring(0, 50) + '...'
    })));
    
    studentExams.forEach(studentExam => {
      // Check if the student exam has a score (even if it's 0)
      if (studentExam.score !== undefined) {
        const examTitle = studentExam.exam.title.toLowerCase();
        console.log(`Processing exam: ${studentExam.exam.title} with score: ${studentExam.score} (type: ${typeof studentExam.score})`);
        
        // Calculate max score for this exam by summing all question weights
        const questionsForThisExam = examQuestions.filter(q => q.exam.toString() === studentExam.exam._id.toString());
        console.log(`Found ${questionsForThisExam.length} questions for exam ${studentExam.exam._id}`);
        
        const maxScoreForThisExam = questionsForThisExam.reduce((sum, question) => {
          const weight = question.weight || 1;
          console.log(`Adding question weight: ${weight}`);
          return sum + weight;
        }, 0);
        
        console.log(`Calculated max score for exam ${studentExam.exam._id}: ${maxScoreForThisExam}`);
        
        // More flexible matching for mid-term exams
        if ((examTitle.includes('mid') || examTitle.includes('Mid-exam')) && midExamScore === null) {
          midExamScore = studentExam.score;
          // Calculate max score for this exam
          midExamMaxScore = maxScoreForThisExam;
          totalExamScore += studentExam.score;
          examCount++;
          console.log(`Set midExamScore to: ${studentExam.score}, maxScore: ${midExamMaxScore}`);
        } else if ((examTitle.includes('final') || examTitle.includes('Final-exam')) && finalExamScore === null) {
          finalExamScore = studentExam.score;
          // Calculate max score for this exam
          finalExamMaxScore = maxScoreForThisExam;
          totalExamScore += studentExam.score;
          examCount++;
          console.log(`Set finalExamScore to: ${studentExam.score}, maxScore: ${finalExamMaxScore}`);
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
    console.log(`Mid exam score: ${midExamScore}, Max: ${midExamMaxScore}`);
    console.log(`Final exam score: ${finalExamScore}, Max: ${finalExamMaxScore}`);
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

    console.log(`Checking grade calculation: overallScore=${overallScore}, examCount=${examCount}`);

    // Determine grade based on overall score as a percentage
    let grade = null;
    if (overallScore !== null) {
      console.log(`Entering grade calculation logic`);
      
      // Calculate grade based on overall score (mid + final + assignment) directly
      // No division by max scores as per requirements
      const percentage = overallScore;
      
      console.log(`Calculated score: ${percentage} (overall score: ${overallScore})`);
      
      // Log each condition for debugging
      console.log(`Grade conditions: >=90:${percentage >= 90}, >=85:${percentage >= 85}, >=80:${percentage >= 80}`);
      console.log(`Grade conditions: >=75:${percentage >= 75}, >=70:${percentage >= 70}, >=65:${percentage >= 65}`);
      console.log(`Grade conditions: >=60:${percentage >= 60}, >=50:${percentage >= 50}, >=45:${percentage >= 45}`);
      console.log(`Grade conditions: >=40:${percentage >= 40}`);
      
      // Ensure we're working with numbers for comparison
      const score = Number(percentage);
      
      if (score >= 90) {
        grade = 'A+';
        console.log('Assigned grade: A+');
      }
      else if (score >= 85) {
        grade = 'A';
        console.log('Assigned grade: A');
      }
      else if (score >= 80) {
        grade = 'A-';
        console.log('Assigned grade: A-');
      }
      else if (score >= 75) {
        grade = 'B+';
        console.log('Assigned grade: B+');
      }
      else if (score >= 70) {
        grade = 'B';
        console.log('Assigned grade: B');
      }
      else if (score >= 65) {
        grade = 'B-';
        console.log('Assigned grade: B-');
      }
      else if (score >= 60) {
        grade = 'C+';
        console.log('Assigned grade: C+');
      }
      else if (score >= 50) {
        grade = 'C';
        console.log('Assigned grade: C');
      }
      else if (score >= 45) {
        grade = 'C-';
        console.log('Assigned grade: C-');
      }
      else if (score >= 40) {
        grade = 'D';
        console.log('Assigned grade: D');
      }
      else {
        grade = 'F';
        console.log('Assigned grade: F');
      }
    } else {
      console.log(`Skipping grade calculation: overallScore is null`);
    }
    
    // Create or update result
    const resultData = {
      student: studentId,
      course: courseId,
      class: classId,
      midExamScore,
      midExamMaxScore,
      finalExamScore,
      finalExamMaxScore,
      assignmentScore,
      overallScore,
      grade
    };
    
    console.log('Result data to save:', resultData);
    console.log('Mid exam max score type:', typeof midExamMaxScore, 'value:', midExamMaxScore);
    console.log('Final exam max score type:', typeof finalExamMaxScore, 'value:', finalExamMaxScore);
    
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
    console.log('Saved result midExamMaxScore:', savedResult.midExamMaxScore);
    console.log('Saved result finalExamMaxScore:', savedResult.finalExamMaxScore);
    
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
    const { midExamScore, midExamMaxScore, finalExamScore, finalExamMaxScore, assignmentScore, overallScore: reqOverallScore, grade } = req.body;
    
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
    if (midExamMaxScore !== undefined) updateData.midExamMaxScore = midExamMaxScore;
    if (finalExamScore !== undefined) updateData.finalExamScore = finalExamScore;
    if (finalExamMaxScore !== undefined) updateData.finalExamMaxScore = finalExamMaxScore;
    if (assignmentScore !== undefined) updateData.assignmentScore = assignmentScore;
    if (reqOverallScore !== undefined) updateData.overallScore = reqOverallScore;
    if (grade !== undefined) updateData.grade = grade;
    
    // Only recalculate overall score and grade if specific scores are being updated
    // and overallScore wasn't explicitly provided
    if ((midExamScore !== undefined || finalExamScore !== undefined || assignmentScore !== undefined) && 
        reqOverallScore === undefined) {
      // Recalculate overall score based on updated values
      const currentMidExamScore = midExamScore !== undefined ? midExamScore : result.midExamScore;
      const currentMidExamMaxScore = midExamMaxScore !== undefined ? midExamMaxScore : result.midExamMaxScore;
      const currentFinalExamScore = finalExamScore !== undefined ? finalExamScore : result.finalExamScore;
      const currentFinalExamMaxScore = finalExamMaxScore !== undefined ? finalExamMaxScore : result.finalExamMaxScore;
      const currentAssignmentScore = assignmentScore !== undefined ? assignmentScore : result.assignmentScore;
      
      // Calculate overall score (sum of all scores)
      let calculatedOverallScore = 0;
      if (currentMidExamScore !== null) calculatedOverallScore += currentMidExamScore;
      if (currentFinalExamScore !== null) calculatedOverallScore += currentFinalExamScore;
      if (currentAssignmentScore !== null) calculatedOverallScore += currentAssignmentScore;
      updateData.overallScore = calculatedOverallScore;
      
      // Recalculate grade based on overall score (mid + final + assignment) directly
      // No division by max scores as per requirements
      const percentage = calculatedOverallScore;
      
      // Ensure we're working with numbers for comparison
      const score = Number(percentage);
      
      if (score >= 90) updateData.grade = 'A+';
      else if (score >= 85) updateData.grade = 'A';
      else if (score >= 80) updateData.grade = 'A-';
      else if (score >= 75) updateData.grade = 'B+';
      else if (score >= 70) updateData.grade = 'B';
      else if (score >= 65) updateData.grade = 'B-';
      else if (score >= 60) updateData.grade = 'C+';
      else if (score >= 50) updateData.grade = 'C';
      else if (score >= 45) updateData.grade = 'C-';
      else if (score >= 40) updateData.grade = 'D';
      else updateData.grade = 'F';
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
    res.status(500).json({
      message: 'Error updating result',
      error: error.message,
      status: 'error'
    });
  }
});

// Toggle result visibility for students
router.patch('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;
    
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
        const decoded = jwt.verify(token, JWT_SECRET);
        user = decoded;
      } catch (err) {
        console.error('Token verification error:', err);
      }
    }
    
    // Only teachers can toggle visibility
    if (!user || user.userType !== 'teacher') {
      return res.status(403).json({
        message: 'Access denied. Only teachers can toggle result visibility.',
        status: 'error'
      });
    }
    
    // Find the result and update visibility
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
        status: 'error'
      });
    }
    
    // Update visibility fields
    result.isVisibleToStudent = isVisible;
    if (isVisible) {
      result.madeVisibleBy = user.teacherId;
      result.madeVisibleAt = new Date();
    } else {
      result.madeVisibleBy = null;
      result.madeVisibleAt = null;
    }
    
    const updatedResult = await result.save();
    
    res.json({
      message: `Result ${isVisible ? 'made visible' : 'hidden'} to student successfully`,
      data: updatedResult,
      status: 'success'
    });
  } catch (error) {
    console.error('Error toggling result visibility:', error);
    res.status(500).json({
      message: 'Error toggling result visibility',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
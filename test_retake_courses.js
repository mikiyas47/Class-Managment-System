// Test script to check if retake courses are being fetched correctly
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Student from './backend/Student.js';
import AddStudent from './backend/AddStudent.js';
import Course from './backend/Course.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Test function to check student courses
const testStudentCourses = async (studentId) => {
  try {
    // Get the student
    const student = await Student.findById(studentId).populate('class');
    console.log('Student:', student);
    
    if (!student) {
      console.log('Student not found');
      return;
    }

    // Get regular courses for the student's class
    const regularCourses = await Course.find({ class: student.class._id })
      .populate('department')
      .populate('class')
      .populate('teacher');
    console.log('Regular courses:', regularCourses);

    // Get added courses for this student (including retake courses)
    const addedCoursesRecords = await AddStudent.find({ student: studentId, status: 'enrolled' })
      .populate({
        path: 'course',
        populate: [
          { path: 'department' },
          { path: 'class' },
          { path: 'teacher' }
        ]
      })
      .populate('assignedClass')
      .populate('originalClass');
    console.log('Added course records:', addedCoursesRecords);

    // Extract course details from added courses and mark them as retake courses
    const addedCourses = addedCoursesRecords.map(record => {
      const course = record.course.toObject();
      course.isRetake = true;
      course.originalClass = record.originalClass;
      course.assignedClass = record.assignedClass;
      course.retakeSemester = record.retakeSemester;
      return course;
    });
    console.log('Added courses with retake info:', addedCourses);

    // Combine regular and added courses
    const allCourses = [...regularCourses, ...addedCourses];
    console.log('All courses:', allCourses);
  } catch (error) {
    console.error('Error testing student courses:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Replace with an actual student ID from your database
  const studentId = process.argv[2];
  if (!studentId) {
    console.log('Please provide a student ID as argument');
    process.exit(1);
  }
  
  await testStudentCourses(studentId);
  
  mongoose.connection.close();
};

main();
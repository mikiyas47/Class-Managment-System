// Script to check retake courses in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import models
import AddStudent from './AddStudent.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp');
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Check retake courses
const checkRetakeCourses = async () => {
  try {
    const retakeRecords = await AddStudent.find({ status: 'enrolled' })
      .populate('student')
      .populate('course')
      .populate('assignedClass')
      .populate('originalClass');
    
    console.log('Retake course records:');
    retakeRecords.forEach(record => {
      console.log(`- Student: ${record.student?.name || 'N/A'} (${record.student?.userId || 'N/A'})`);
      console.log(`  Course: ${record.course?.subject || 'N/A'} (${record.course?.code || 'N/A'})`);
      console.log(`  Original Class: Year ${record.originalClass?.year || 'N/A'} ${record.originalClass?.semester || 'N/A'} Semester`);
      console.log(`  Assigned Class: Year ${record.assignedClass?.year || 'N/A'} ${record.assignedClass?.semester || 'N/A'} Semester`);
      console.log(`  Retake Semester: ${record.retakeSemester?.year || 'N/A'} ${record.retakeSemester?.semester || 'N/A'}`);
      console.log('---');
    });
    
    console.log(`Total retake records: ${retakeRecords.length}`);
  } catch (error) {
    console.error('Error checking retake courses:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await checkRetakeCourses();
  mongoose.connection.close();
};

main();
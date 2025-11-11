// Script to get a student ID from the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import all models to register them
import Student from './Student.js';

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

// Get a student ID
const getStudentId = async () => {
  try {
    const student = await Student.findOne();
    if (student) {
      console.log('Student ID:', student._id.toString());
      console.log('Student Name:', student.name);
      console.log('Student User ID:', student.userId);
    } else {
      console.log('No students found in database');
    }
  } catch (error) {
    console.error('Error getting student:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await getStudentId();
  mongoose.connection.close();
};

main();
// Script to list all students in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Student from './backend/Student.js';

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

// List all students
const listStudents = async () => {
  try {
    const students = await Student.find().populate('class').populate('department');
    console.log('Students in database:');
    students.forEach(student => {
      console.log(`- ${student.name} (${student.userId}) - Class: ${student.class?.year || 'N/A'} ${student.class?.semester || 'N/A'} Semester`);
    });
    console.log(`Total students: ${students.length}`);
  } catch (error) {
    console.error('Error listing students:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await listStudents();
  mongoose.connection.close();
};

main();
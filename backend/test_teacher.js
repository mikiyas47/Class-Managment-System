import Teacher from "./Teacher.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: __dirname + '/.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    
    console.log("Attempting to connect to MongoDB with URI:", process.env.MONGO_URI);
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// Test teacher creation and list existing teachers
const testTeacherFunctionality = async () => {
  try {
    await connectDB();
    
    // List existing teachers
    const existingTeachers = await Teacher.find({});
    console.log('Existing teachers in database:', existingTeachers.length);
    
    if (existingTeachers.length > 0) {
      console.log('First few teachers:');
      existingTeachers.slice(0, 3).forEach(teacher => {
        console.log(`- ${teacher.name} (${teacher.email}) - ID: ${teacher.userId}`);
      });
    }
    
    // Test creating a new teacher
    console.log('\nCreating test teacher...');
    
    // Create a new teacher
    const teacher = new Teacher({
      userId: 'test123',
      name: 'Test Teacher',
      email: 'test@example.com',
      phoneNumber: '1234567890',
      password: 'password123'
    });
    
    console.log('Teacher object:', teacher);
    
    await teacher.save();
    console.log('Teacher saved successfully with ID:', teacher._id);
    
    // Verify the teacher was saved
    const savedTeacher = await Teacher.findOne({ userId: 'test123' });
    console.log('Retrieved teacher:', savedTeacher);
    
    // Clean up - delete the test teacher
    await Teacher.deleteOne({ userId: 'test123' });
    console.log('Test teacher deleted');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
};

testTeacherFunctionality();
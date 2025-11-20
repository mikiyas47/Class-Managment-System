// Script to test admin user password
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });

// Import the Admin model
import Admin from './Admin.js';

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
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    return false;
  }
};

// Test admin user password
const testAdminPassword = async () => {
  try {
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin user with email mikishemels@gmail.com not found');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('ID:', admin._id);
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Stored password hash:', admin.password);
    
    // Test password
    const testPassword = 'miki1234';
    console.log('Testing password:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('Direct bcrypt comparison result:', isMatch);
    
    // Also test using the model's method
    const isMatch2 = await admin.comparePassword(testPassword);
    console.log('Model method comparison result:', isMatch2);
    
    if (!isMatch || !isMatch2) {
      console.log('❌ Password does not match. The stored hash might be corrupted.');
      
      // Let's try to recreate the hash
      console.log('Testing hash recreation...');
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(testPassword, salt);
      console.log('New hash:', newHash);
      
      const isNewMatch = await bcrypt.compare(testPassword, newHash);
      console.log('New hash comparison result:', isNewMatch);
    } else {
      console.log('✅ Password matches!');
    }
  } catch (error) {
    console.error('❌ Error testing admin password:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
const run = async () => {
  const isConnected = await connectDB();
  if (isConnected) {
    await testAdminPassword();
  }
};

run();
// Script to check if the admin user exists in the database
import mongoose from 'mongoose';
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

// Check if admin user exists
const checkAdminUser = async () => {
  try {
    const admin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('ID:', admin._id);
      console.log('Name:', admin.name);
      console.log('Email:', admin.email);
      // Note: password field will not be included in the output due to toJSON method
    } else {
      console.log('❌ Admin user with email mikishemels@gmail.com not found');
    }
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
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
    await checkAdminUser();
  }
};

run();
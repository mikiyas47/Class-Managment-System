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
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user with email mikishemels@gmail.com already exists');
      return;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('miki1234', salt);
    
    // Create new admin user
    const admin = new Admin({
      name: 'Mikishe Melaku',
      email: 'mikishemels@gmail.com',
      password: hashedPassword
    });
    
    // Save the admin user
    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('Email: mikishemels@gmail.com');
    console.log('Password: miki1234 (hashed in database)');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await createAdminUser();
};

run();
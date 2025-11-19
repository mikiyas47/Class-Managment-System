// Simple script to create an admin user
// This can be run directly in Render using a one-off command

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './Admin.js';

async function createAdmin() {
  try {
    // Connect to MongoDB (using the environment variable set in Render)
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'mikishemels@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.connection.close();
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('miki1234', salt);
    
    // Create admin user
    const admin = new Admin({
      name: 'Mikishe Melaku',
      email: 'mikishemels@gmail.com',
      password: hashedPassword
    });
    
    await admin.save();
    console.log('Admin user created successfully!');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAdmin();
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './Admin.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Function to add admin
const addAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'miki@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin with email miki@gmail.com already exists');
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      name: 'miki',
      email: 'miki@gmail.com',
      password: 'miki1234'
    });

    // Save admin to database
    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('Admin details:', {
      id: admin._id,
      name: admin.name,
      email: admin.email
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

// Run the function
addAdmin();
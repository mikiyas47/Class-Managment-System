import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

console.log("MONGO_URI from .env:", process.env.MONGO_URI);

// Define the Assignment schema
const assignmentSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    
    // Fetch all assignments without populating
    const assignments = await Assignment.find();
    
    console.log(`Found ${assignments.length} assignments:`);
    
    for (const assignment of assignments) {
      console.log('\n--- Assignment ---');
      console.log('ID:', assignment._id);
      console.log('Filename:', assignment.filename);
      console.log('Original Name:', assignment.originalName);
      console.log('Path:', assignment.path);
      console.log('File exists:', assignment.path ? fs.existsSync(assignment.path) : 'No path');
      console.log('Class ID:', assignment.class);
      console.log('Teacher ID:', assignment.teacher);
      console.log('Created At:', assignment.createdAt);
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
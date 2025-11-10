import mongoose from 'mongoose';

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

// Ensure unique combination of class, teacher, and filename
assignmentSchema.index({ class: 1, teacher: 1, filename: 1 }, { unique: true });

export default mongoose.model('Assignment', assignmentSchema);
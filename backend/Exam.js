import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
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
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number, // Duration in minutes
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Ensure unique combination of class, teacher, and startTime
examSchema.index({ class: 1, teacher: 1, startTime: 1 }, { unique: true });

export default mongoose.model('Exam', examSchema);
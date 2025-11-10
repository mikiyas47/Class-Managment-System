import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  crh: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Ensure unique combination of department, class, and code
courseSchema.index({ department: 1, class: 1, code: 1 }, { unique: true });

export default mongoose.model('Course', courseSchema);
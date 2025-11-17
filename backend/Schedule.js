import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  roomNumber: {
    type: String,
    required: true,
    trim: true
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  }
}, {
  timestamps: true
});

// Ensure unique combination of class, day, and time slot
scheduleSchema.index({ class: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

// Ensure unique combination of room, day, and time slot
scheduleSchema.index({ roomNumber: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

export default mongoose.model('Schedule', scheduleSchema);
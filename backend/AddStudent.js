import mongoose from 'mongoose';

const addStudentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  originalClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // The class/year the student should join for retaking the course
  // This should be a lower year than the student's original class
  assignedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  // Semester when the student will retake the course
  retakeSemester: {
    year: {
      type: Number,
      required: true
    },
    semester: {
      type: String,
      required: true,
      enum: ['first', 'second']
    }
  },
  // Status of the retake process
  status: {
    type: String,
    enum: ['pending', 'enrolled', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Ensure a student can only be added once for a specific course
addStudentSchema.index({ student: 1, course: 1 }, { unique: true });

// Ensure a student can only be assigned to one class for retaking a specific course
addStudentSchema.index({ student: 1, course: 1, assignedClass: 1 }, { unique: true });

export default mongoose.model('AddStudent', addStudentSchema);
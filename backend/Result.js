import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  // Mid-exam score (from StudentExam where exam title is "Mid-exam")
  midExamScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Max score for Mid-exam
  midExamMaxScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Final-exam score (from StudentExam where exam title is "Final-exam")
  finalExamScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Max score for Final-exam
  finalExamMaxScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Assignment score
  assignmentScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Overall score calculation (can be customized)
  overallScore: {
    type: Number,
    min: 0,
    default: null
  },
  // Grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F)
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    default: null
  },
  // Control field for when students can see their results
  isVisibleToStudent: {
    type: Boolean,
    default: false // Initially hidden from students
  },
  // Teacher who made the result visible (for audit purposes)
  madeVisibleBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  // Timestamp when result was made visible to students
  madeVisibleAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure unique combination of student and course
resultSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);
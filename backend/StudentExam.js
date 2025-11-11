import mongoose from 'mongoose';

const studentExamSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  score: {
    type: Number,
    min: 0
  },
  // Maximum possible score for this exam (based on question weights)
  maxScore: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Ensure unique combination of student and exam
studentExamSchema.index({ student: 1, exam: 1 }, { unique: true });

export default mongoose.model('StudentExam', studentExamSchema);
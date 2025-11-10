import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  studentExam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentExam',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedOption: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  }
}, {
  timestamps: true
});

// Ensure unique combination of studentExam and question
answerSchema.index({ studentExam: 1, question: 1 }, { unique: true });

export default mongoose.model('Answer', answerSchema);
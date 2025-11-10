import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  optionA: {
    type: String,
    required: true,
    trim: true
  },
  optionB: {
    type: String,
    required: true,
    trim: true
  },
  optionC: {
    type: String,
    required: true,
    trim: true
  },
  optionD: {
    type: String,
    required: true,
    trim: true
  },
  correctOption: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  }
}, {
  timestamps: true
});

// Ensure unique combination of exam and questionText
questionSchema.index({ exam: 1, questionText: 1 }, { unique: true });

export default mongoose.model('Question', questionSchema);
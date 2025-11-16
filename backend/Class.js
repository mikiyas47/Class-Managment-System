import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  semester: {
    type: String,
    required: true,
    enum: ['first', 'second']
  }
}, {
  timestamps: true
});

// Ensure unique combination of department, year, and semester
classSchema.index({ department: 1, year: 1, semester: 1 }, { unique: true });

export default mongoose.model('Class', classSchema);
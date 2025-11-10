import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  science: {
    type: String,
    required: true,
    enum: ['natural', 'social'],
    trim: true
  }
}, {
  timestamps: true
});

// Note: The unique: true on the name field already creates an index, so we don't need to explicitly define it again
// departmentSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Department', departmentSchema);
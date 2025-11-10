import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const departmentHeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phoneNo: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  }
}, {
  timestamps: true
});

// Hash password before saving
departmentHeadSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add a method to compare passwords
departmentHeadSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from response when converting to JSON (for security)
departmentHeadSchema.methods.toJSON = function() {
  const departmentHead = this;
  const departmentHeadObject = departmentHead.toObject();
  
  delete departmentHeadObject.password;
  
  return departmentHeadObject;
};

export default mongoose.model('DepartmentHead', departmentHeadSchema);
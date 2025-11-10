import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true,
    minlength: 6
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
  const admin = this;
  
  // Only hash the password if it has been modified (or is new)
  if (!admin.isModified('password')) return next();
  
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add a method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from response when converting to JSON (for security)
adminSchema.methods.toJSON = function() {
  const admin = this;
  const adminObject = admin.toObject();
  
  delete adminObject.password;
  
  return adminObject;
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
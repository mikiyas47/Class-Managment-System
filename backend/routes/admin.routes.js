import express from 'express';
import Admin from '../Admin.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all admins
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    
    res.json({
      message: 'Admins retrieved successfully',
      data: admins,
      count: admins.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      message: 'Error retrieving admins',
      error: error.message,
      status: 'error'
    });
  }
});

// Get admin by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Admin retrieved successfully',
      data: admin,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({
      message: 'Error retrieving admin',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new admin
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      return res.status(400).json({
        message: 'Admin with this email already exists',
        status: 'error'
      });
    }
    
    // Create new admin
    const admin = new Admin({
      name,
      email,
      password
    });
    
    await admin.save();
    
    res.status(201).json({
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Admin with this email already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating admin',
      error: error.message,
      status: 'error'
    });
  }
});

// Change admin password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id; // Get admin ID from authenticated token
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required',
        status: 'error'
      });
    }
    
    // Find admin by ID
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found',
        status: 'error'
      });
    }
    
    // Check if current password is correct
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect',
        status: 'error'
      });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    res.json({
      message: 'Password changed successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      message: 'Error changing password',
      error: error.message,
      status: 'error'
    });
  }
});

// Update admin by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    
    // Validate required fields (password is not required for updates)
    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
        status: 'error'
      });
    }
    
    // Check if another admin with this email already exists
    const existingAdmin = await Admin.findOne({
      email,
      _id: { $ne: id }
    });
    
    if (existingAdmin) {
      return res.status(400).json({
        message: 'Admin with this email already exists',
        status: 'error'
      });
    }
    
    const admin = await Admin.findByIdAndUpdate(
      id,
      { name, email },
      { new: true, runValidators: true }
    );
    
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Admin updated successfully',
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Admin with this email already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating admin',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete admin by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndDelete(id);
    
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Admin deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      message: 'Error deleting admin',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
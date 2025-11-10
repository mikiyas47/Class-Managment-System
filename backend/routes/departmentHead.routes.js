import express from 'express';
import DepartmentHead from '../DepartmentHead.js';
import Department from '../Department.js';
import Admin from '../Admin.js';
import Teacher from '../Teacher.js';
import Student from '../Student.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all department heads
router.get('/', async (req, res) => {
  try {
    const departmentHeads = await DepartmentHead.find().populate('department').sort({ createdAt: -1 });
    
    res.json({
      message: 'Department Heads retrieved successfully',
      data: departmentHeads,
      count: departmentHeads.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching department heads:', error);
    res.status(500).json({
      message: 'Error retrieving department heads',
      error: error.message,
      status: 'error'
    });
  }
});

// Get department head by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const departmentHead = await DepartmentHead.findById(id).populate('department');
    
    if (!departmentHead) {
      return res.status(404).json({
        message: 'Department Head not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department Head retrieved successfully',
      data: departmentHead,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching department head:', error);
    res.status(500).json({
      message: 'Error retrieving department head',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new department head
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phoneNo, password, department } = req.body;
    
    // Validate required fields
    if (!name || !email || !phoneNo || !password || !department) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if department head with this email already exists
    const existingDepartmentHead = await DepartmentHead.findOne({ email });
    
    if (existingDepartmentHead) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    // Check if email already exists in other user types (Admin, Teacher, Student)
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    // Check if department head with this phone number already exists
    const existingPhone = await DepartmentHead.findOne({ phoneNo });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    // Check if phone number already exists in other user types (Admin has no phone, Teacher uses phoneNumber, Student uses phoneNo)
    // Note: Admin doesn't have a phone number field
    
    // Teacher uses 'phoneNumber' field instead of 'phoneNo'
    const existingTeacherPhone = await Teacher.findOne({ phoneNumber: phoneNo });
    if (existingTeacherPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    const existingStudentPhone = await Student.findOne({ phoneNo });
    if (existingStudentPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    // Create new department head
    const departmentHead = new DepartmentHead({
      name,
      email,
      phoneNo,
      password,
      department
    });
    
    await departmentHead.save();
    
    // Populate the response with referenced data
    const savedDepartmentHead = await DepartmentHead.findById(departmentHead._id).populate('department');
    
    res.status(201).json({
      message: 'Department Head created successfully',
      data: savedDepartmentHead,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating department head:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Department Head with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNo) {
        return res.status(400).json({
          message: 'Department Head with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error creating department head',
      error: error.message,
      status: 'error'
    });
  }
});

// Update department head by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNo, department } = req.body;
    
    // Validate required fields (password is not required for updates)
    if (!name || !email || !phoneNo || !department) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Check if another department head with this email already exists
    const existingEmail = await DepartmentHead.findOne({
      email,
      _id: { $ne: id }
    });
    
    if (existingEmail) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    // Check if email already exists in other user types (Admin, Teacher, Student)
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({
        message: 'A user with this email already exists',
        status: 'error'
      });
    }
    
    // Check if another department head with this phone number already exists
    const existingPhone = await DepartmentHead.findOne({
      phoneNo,
      _id: { $ne: id }
    });
    
    if (existingPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    // Check if phone number already exists in other user types (Admin has no phone, Teacher uses phoneNumber, Student uses phoneNo)
    // Note: Admin doesn't have a phone number field
    
    // Teacher uses 'phoneNumber' field instead of 'phoneNo'
    const existingTeacherPhone = await Teacher.findOne({ phoneNumber: phoneNo });
    if (existingTeacherPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    const existingStudentPhone = await Student.findOne({ phoneNo });
    if (existingStudentPhone) {
      return res.status(400).json({
        message: 'A user with this phone number already exists',
        status: 'error'
      });
    }
    
    const departmentHead = await DepartmentHead.findByIdAndUpdate(
      id,
      { name, email, phoneNo, department },
      { new: true, runValidators: true }
    ).populate('department');
    
    if (!departmentHead) {
      return res.status(404).json({
        message: 'Department Head not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department Head updated successfully',
      data: departmentHead,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating department head:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({
          message: 'Department Head with this email already exists',
          status: 'error'
        });
      } else if (error.keyPattern.phoneNo) {
        return res.status(400).json({
          message: 'Department Head with this phone number already exists',
          status: 'error'
        });
      }
    }
    
    res.status(500).json({
      message: 'Error updating department head',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete department head by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const departmentHead = await DepartmentHead.findByIdAndDelete(id);
    
    if (!departmentHead) {
      return res.status(404).json({
        message: 'Department Head not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department Head deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting department head:', error);
    res.status(500).json({
      message: 'Error deleting department head',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
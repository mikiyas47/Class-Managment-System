import express from 'express';
import Department from '../Department.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    
    res.json({
      message: 'Departments retrieved successfully',
      data: departments,
      count: departments.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      message: 'Error retrieving departments',
      error: error.message,
      status: 'error'
    });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);
    
    if (!department) {
      return res.status(404).json({
        message: 'Department not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department retrieved successfully',
      data: department,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      message: 'Error retrieving department',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new department
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, science } = req.body;
    
    // Validate required fields
    if (!name || !science) {
      return res.status(400).json({
        message: 'Name and science fields are required',
        status: 'error'
      });
    }
    
    // Validate science field
    if (!['natural', 'social'].includes(science)) {
      return res.status(400).json({
        message: 'Science must be either "natural" or "social"',
        status: 'error'
      });
    }
    
    // Check if department with this name already exists
    const existingDepartment = await Department.findOne({ name });
    
    if (existingDepartment) {
      return res.status(400).json({
        message: 'Department with this name already exists',
        status: 'error'
      });
    }
    
    // Create new department
    const department = new Department({
      name,
      science
    });
    
    await department.save();
    
    res.status(201).json({
      message: 'Department created successfully',
      data: department,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Department with this name already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating department',
      error: error.message,
      status: 'error'
    });
  }
});

// Update department by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, science } = req.body;
    
    // Validate required fields
    if (!name || !science) {
      return res.status(400).json({
        message: 'Name and science fields are required',
        status: 'error'
      });
    }
    
    // Validate science field
    if (!['natural', 'social'].includes(science)) {
      return res.status(400).json({
        message: 'Science must be either "natural" or "social"',
        status: 'error'
      });
    }
    
    // Check if another department with this name already exists
    const existingDepartment = await Department.findOne({
      name,
      _id: { $ne: id }
    });
    
    if (existingDepartment) {
      return res.status(400).json({
        message: 'Department with this name already exists',
        status: 'error'
      });
    }
    
    const department = await Department.findByIdAndUpdate(
      id,
      { name, science },
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({
        message: 'Department not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department updated successfully',
      data: department,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Department with this name already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating department',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete department by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndDelete(id);
    
    if (!department) {
      return res.status(404).json({
        message: 'Department not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Department deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      message: 'Error deleting department',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
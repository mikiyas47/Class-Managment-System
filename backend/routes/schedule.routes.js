import express from 'express';
import Schedule from '../Schedule.js';
import Class from '../Class.js';
import Course from '../Course.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get all schedules (with department filtering for department heads)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user information from the authenticated request
    const user = req.user;
    
    // Log user information for debugging
    console.log('User info in schedule routes:', user);
    
    let query = {};
    
    // If user is a department head, only show schedules from their department
    if (user && user.userType === 'department-head') {
      // Check if departmentId exists in user object
      if (!user.departmentId) {
        console.error('Department ID not found in user token for department head:', user);
        return res.status(400).json({
          message: 'Department information not found for department head',
          status: 'error'
        });
      }
      query = { department: user.departmentId };
    }
    
    const schedules = await Schedule.find(query)
      .populate('class')
      .populate('course')
      .populate('department')
      .sort({ dayOfWeek: 1, startTime: 1 });
    
    res.json({
      message: 'Schedules retrieved successfully',
      data: schedules,
      count: schedules.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      message: 'Error retrieving schedules',
      error: error.message,
      status: 'error'
    });
  }
});

// Get schedule by ID (with department filtering for department heads)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findById(id)
      .populate('class')
      .populate('course')
      .populate('department');
    
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found',
        status: 'error'
      });
    }
    
    // Get user information from the authenticated request
    const user = req.user;
    
    // If user is a department head, check if they have access to this schedule
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (schedule.department._id.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only view schedules from your department.',
          status: 'error'
        });
      }
    }
    
    res.json({
      message: 'Schedule retrieved successfully',
      data: schedule,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      message: 'Error retrieving schedule',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new schedule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { class: classId, course: courseId, roomNumber, dayOfWeek, startTime, endTime } = req.body;
    
    // Get user information from the authenticated request
    const user = req.user;
    
    // Validate required fields
    if (!classId || !courseId || !roomNumber || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        message: 'Time must be in HH:MM format',
        status: 'error'
      });
    }
    
    // Validate that end time is after start time
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    if (endTotalMinutes <= startTotalMinutes) {
      return res.status(400).json({
        message: 'End time must be after start time',
        status: 'error'
      });
    }
    
    // Get class and course to verify they exist and belong to the same department
    const classItem = await Class.findById(classId);
    const courseItem = await Course.findById(courseId);
    
    if (!classItem) {
      return res.status(400).json({
        message: 'Class not found',
        status: 'error'
      });
    }
    
    if (!courseItem) {
      return res.status(400).json({
        message: 'Course not found',
        status: 'error'
      });
    }
    
    // Verify that class and course belong to the same department
    if (classItem.department.toString() !== courseItem.department.toString()) {
      return res.status(400).json({
        message: 'Class and course must belong to the same department',
        status: 'error'
      });
    }
    
    // If user is a department head, they can only create schedules for their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (classItem.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only create schedules for your department.',
          status: 'error'
        });
      }
    }
    
    // Check for overlapping schedules in the same room and day
    const existingSchedules = await Schedule.find({
      roomNumber,
      dayOfWeek
    });
    
    // Convert times to minutes for comparison
    const newStartMinutes = startTotalMinutes;
    const newEndMinutes = endTotalMinutes;
    
    // Check for time overlaps
    const hasOverlap = existingSchedules.some(schedule => {
      const [existingStartHours, existingStartMinutes] = schedule.startTime.split(':').map(Number);
      const [existingEndHours, existingEndMinutes] = schedule.endTime.split(':').map(Number);
      const existingStartTotalMinutes = existingStartHours * 60 + existingStartMinutes;
      const existingEndTotalMinutes = existingEndHours * 60 + existingEndMinutes;
      
      // Check if the new schedule overlaps with existing schedule
      // Overlap occurs when: (newStart < existingEnd) AND (newEnd > existingStart)
      return (newStartMinutes < existingEndTotalMinutes) && (newEndMinutes > existingStartTotalMinutes);
    });
    
    if (hasOverlap) {
      return res.status(400).json({
        message: 'Another schedule already exists for this room at the same time',
        status: 'error'
      });
    }
    
    // Create new schedule
    const schedule = new Schedule({
      class: classId,
      course: courseId,
      roomNumber,
      dayOfWeek,
      startTime,
      endTime,
      department: classItem.department
    });
    
    await schedule.save();
    
    // Populate the response with referenced data
    const savedSchedule = await Schedule.findById(schedule._id)
      .populate('class')
      .populate('course')
      .populate('department');
    
    res.status(201).json({
      message: 'Schedule created successfully',
      data: savedSchedule,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A schedule with this class, day, and time already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error creating schedule',
      error: error.message,
      status: 'error'
    });
  }
});

// Update schedule by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { class: classId, course: courseId, roomNumber, dayOfWeek, startTime, endTime } = req.body;
    
    // Get user information from the authenticated request
    const user = req.user;
    
    // Validate required fields
    if (!classId || !courseId || !roomNumber || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        message: 'Time must be in HH:MM format',
        status: 'error'
      });
    }
    
    // Validate that end time is after start time
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    if (endTotalMinutes <= startTotalMinutes) {
      return res.status(400).json({
        message: 'End time must be after start time',
        status: 'error'
      });
    }
    
    // Get the existing schedule
    const existingSchedule = await Schedule.findById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        message: 'Schedule not found',
        status: 'error'
      });
    }
    
    // If user is a department head, check if they have access to this schedule
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (existingSchedule.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only update schedules from your department.',
          status: 'error'
        });
      }
    }
    
    // Get class and course to verify they exist and belong to the same department
    const classItem = await Class.findById(classId);
    const courseItem = await Course.findById(courseId);
    
    if (!classItem) {
      return res.status(400).json({
        message: 'Class not found',
        status: 'error'
      });
    }
    
    if (!courseItem) {
      return res.status(400).json({
        message: 'Course not found',
        status: 'error'
      });
    }
    
    // Verify that class and course belong to the same department
    if (classItem.department.toString() !== courseItem.department.toString()) {
      return res.status(400).json({
        message: 'Class and course must belong to the same department',
        status: 'error'
      });
    }
    
    // If user is a department head, they can only update schedules for their department
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (classItem.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only update schedules for your department.',
          status: 'error'
        });
      }
    }
    
    // Check for overlapping schedules in the same room and day (excluding the current schedule being updated)
    const existingSchedules = await Schedule.find({
      roomNumber,
      dayOfWeek,
      _id: { $ne: id }  // Exclude the current schedule being updated
    });
    
    // Convert times to minutes for comparison
    const newStartMinutes = startTotalMinutes;
    const newEndMinutes = endTotalMinutes;
    
    // Check for time overlaps
    const hasOverlap = existingSchedules.some(schedule => {
      const [existingStartHours, existingStartMinutes] = schedule.startTime.split(':').map(Number);
      const [existingEndHours, existingEndMinutes] = schedule.endTime.split(':').map(Number);
      const existingStartTotalMinutes = existingStartHours * 60 + existingStartMinutes;
      const existingEndTotalMinutes = existingEndHours * 60 + existingEndMinutes;
      
      // Check if the new schedule overlaps with existing schedule
      // Overlap occurs when: (newStart < existingEnd) AND (newEnd > existingStart)
      return (newStartMinutes < existingEndTotalMinutes) && (newEndMinutes > existingStartTotalMinutes);
    });
    
    if (hasOverlap) {
      return res.status(400).json({
        message: 'Another schedule already exists for this room at the same time',
        status: 'error'
      });
    }
    
    const schedule = await Schedule.findByIdAndUpdate(
      id,
      {
        class: classId,
        course: courseId,
        roomNumber,
        dayOfWeek,
        startTime,
        endTime,
        department: classItem.department
      },
      { new: true, runValidators: true }
    )
      .populate('class')
      .populate('course')
      .populate('department');
    
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Schedule updated successfully',
      data: schedule,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A schedule with this class, day, and time already exists',
        status: 'error'
      });
    }
    
    res.status(500).json({
      message: 'Error updating schedule',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete schedule by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user information from the authenticated request
    const user = req.user;
    
    // Get the existing schedule
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found',
        status: 'error'
      });
    }
    
    // If user is a department head, check if they have access to this schedule
    if (user && user.userType === 'department-head' && user.departmentId) {
      if (schedule.department.toString() !== user.departmentId) {
        return res.status(403).json({
          message: 'Access denied. You can only delete schedules from your department.',
          status: 'error'
        });
      }
    }
    
    await Schedule.findByIdAndDelete(id);
    
    res.json({
      message: 'Schedule deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      message: 'Error deleting schedule',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
import express from 'express';
import Announcement from '../Announcement.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all announcements
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // If class parameter is provided, filter by class
    if (req.query.class) {
      query.class = req.query.class;
    }
    
    const announcements = await Announcement.find(query).populate('class').populate('teacher').sort({ createdAt: -1 });
    
    res.json({
      message: 'Announcements retrieved successfully',
      data: announcements,
      count: announcements.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      message: 'Error retrieving announcements',
      error: error.message,
      status: 'error'
    });
  }
});

// Get announcement by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id).populate('class').populate('teacher');
    
    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Announcement retrieved successfully',
      data: announcement,
      status: 'success'
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      message: 'Error retrieving announcement',
      error: error.message,
      status: 'error'
    });
  }
});

// Create new announcement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { class: classId, teacher, title, message } = req.body;
    
    // Validate required fields
    if (!classId || !teacher || !title || !message) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    // Create new announcement
    const announcement = new Announcement({
      class: classId,
      teacher,
      title,
      message
    });
    
    await announcement.save();
    
    // Populate the response with referenced data
    const savedAnnouncement = await Announcement.findById(announcement._id)
      .populate('class', 'year semester')
      .populate('teacher', 'name email');
    
    res.status(201).json({
      message: 'Announcement created successfully',
      data: savedAnnouncement,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    
    res.status(500).json({
      message: 'Error creating announcement',
      error: error.message,
      status: 'error'
    });
  }
});

// Update announcement by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { class: classId, teacher, title, message } = req.body;
    
    // Validate required fields
    if (!classId || !teacher || !title || !message) {
      return res.status(400).json({
        message: 'All fields are required',
        status: 'error'
      });
    }
    
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        class: classId,
        teacher,
        title,
        message
      },
      { new: true, runValidators: true }
    ).populate('class', 'year semester').populate('teacher', 'name email');
    
    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Announcement updated successfully',
      data: announcement,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    
    res.status(500).json({
      message: 'Error updating announcement',
      error: error.message,
      status: 'error'
    });
  }
});

// Delete announcement by ID
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    
    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found',
        status: 'error'
      });
    }
    
    res.json({
      message: 'Announcement deleted successfully',
      status: 'success'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      message: 'Error deleting announcement',
      error: error.message,
      status: 'error'
    });
  }
});

export default router;
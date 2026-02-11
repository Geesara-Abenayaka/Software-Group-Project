import express from 'express';
import Application from '../models/Application.js';

const router = express.Router();

// Create a new application
router.post('/', async (req, res) => {
  try {
    const applicationData = req.body;
    
    // Create new application
    const application = new Application(applicationData);
    await application.save();
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
});

// Get all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// Get applications by program
router.get('/program/:program', async (req, res) => {
  try {
    const { program } = req.params;
    const applications = await Application.find({ program }).sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// Get single application by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
});

// Update application status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const application = await Application.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true }
    );
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application',
      error: error.message
    });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findByIdAndDelete(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting application',
      error: error.message
    });
  }
});

export default router;

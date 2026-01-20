import express from 'express';
import Program from '../models/Program.js';

const router = express.Router();

// Get all programs
router.get('/', async (req, res) => {
  try {
    const programs = await Program.find().select('-resources -deadlines -detailedDescription');
    res.json({ success: true, data: programs });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch programs', error: error.message });
  }
});

// Get single program by ID or shortCode
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by _id first, then by shortCode
    let program = await Program.findById(identifier).catch(() => null);
    
    if (!program) {
      program = await Program.findOne({ shortCode: identifier });
    }
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    res.json({ success: true, data: program });
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch program', error: error.message });
  }
});

// Create new program (admin only)
router.post('/', async (req, res) => {
  try {
    const program = new Program(req.body);
    await program.save();
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(400).json({ success: false, message: 'Failed to create program', error: error.message });
  }
});

// Update program (admin only)
router.put('/:id', async (req, res) => {
  try {
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    res.json({ success: true, data: program });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(400).json({ success: false, message: 'Failed to update program', error: error.message });
  }
});

// Delete program (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    res.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ success: false, message: 'Failed to delete program', error: error.message });
  }
});

export default router;

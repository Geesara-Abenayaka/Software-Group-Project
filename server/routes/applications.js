import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import { sendBulkEmail } from '../utils/emailService.js';

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

// Send bulk email to selected applications in a program
router.post('/program/:program/bulk-email', async (req, res) => {
  try {
    const { program } = req.params;
    const { applicationIds, subject, message } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'applicationIds must be a non-empty array'
      });
    }

    if (typeof subject !== 'string' || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'subject and message are required'
      });
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'subject and message cannot be empty'
      });
    }

    if (trimmedSubject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'subject cannot exceed 200 characters'
      });
    }

    if (trimmedMessage.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'message cannot exceed 10000 characters'
      });
    }

    const validApplicationIds = [...new Set(
      applicationIds
        .map((id) => String(id).trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )];

    if (validApplicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application IDs were provided'
      });
    }

    const applications = await Application.find({
      _id: { $in: validApplicationIds },
      program
    }).select('_id fullName email status');

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching applications found for this program'
      });
    }

    const recipients = applications
      .filter((application) => typeof application.email === 'string' && application.email.trim())
      .map((application) => ({
        applicationId: application._id.toString(),
        fullName: application.fullName,
        email: application.email.trim(),
        status: application.status
      }));

    const deduplicatedRecipients = [];
    const seenEmails = new Set();

    recipients.forEach((recipient) => {
      const normalizedEmail = recipient.email.toLowerCase();
      if (seenEmails.has(normalizedEmail)) {
        return;
      }
      seenEmails.add(normalizedEmail);
      deduplicatedRecipients.push(recipient);
    });

    if (deduplicatedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipient emails found in selected applications'
      });
    }

    const programData = await Program.findOne({ shortCode: program }).select('title');
    const programName = programData?.title || program;

    const deliveryReport = await sendBulkEmail({
      recipients: deduplicatedRecipients,
      subject: trimmedSubject,
      content: trimmedMessage,
      programName
    });

    const statusCode = deliveryReport.failedCount === 0
      ? 200
      : deliveryReport.sentCount > 0
        ? 207
        : 500;

    return res.status(statusCode).json({
      success: deliveryReport.sentCount > 0,
      message: deliveryReport.failedCount === 0
        ? 'Bulk email sent successfully'
        : 'Bulk email sent with partial failures',
      data: {
        totalRecipients: deduplicatedRecipients.length,
        sentCount: deliveryReport.sentCount,
        failedCount: deliveryReport.failedCount,
        failedRecipients: deliveryReport.failedRecipients,
        isSimulated: deliveryReport.isSimulated
      }
    });
  } catch (error) {
    console.error('Error sending bulk email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending bulk email',
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

// Update application marks
router.patch('/:id/marks', async (req, res) => {
  try {
    const { id } = req.params;
    const { oaMarks, writingMarks, interviewMarks, status, graduationDate } = req.body;
    
    const updateData = {};
    if (oaMarks !== undefined) updateData.oaMarks = oaMarks;
    if (writingMarks !== undefined) updateData.writingMarks = writingMarks;
    if (interviewMarks !== undefined) updateData.interviewMarks = interviewMarks;
    if (status !== undefined) updateData.status = status;
    if (graduationDate !== undefined) updateData.graduationDate = graduationDate;
    
    const application = await Application.findByIdAndUpdate(
      id,
      updateData,
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
      message: 'Marks updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating marks:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating marks',
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

import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import { sendBulkEmail } from '../utils/emailService.js';
import { 
  saveFileToGridFS, 
  getFileStream, 
  deleteMultipleFiles,
  getFileMetadata
} from '../utils/gridfsService.js';

const router = express.Router();

const APPLICATION_SUMMARY_FIELDS = [
  '_id',
  'program',
  'status',
  'fullName',
  'nameWithInitials',
  'nicNo',
  'telephone',
  'mobile',
  'email',
  'createdAt',
  'submittedAt'
].join(' ');

// Create a new application
router.post('/', async (req, res) => {
  try {
    const applicationData = req.body;
    console.log('📥 Received application submission...');

    // Normalize key fields so duplicate checks are reliable.
    applicationData.program = String(applicationData.program || '').trim();
    applicationData.nicNo = String(applicationData.nicNo || '').trim().toUpperCase();

    // Prevent multiple submissions for the same NIC in the same program.
    const duplicateApplication = await Application.findOne({
      program: applicationData.program,
      nicNo: applicationData.nicNo
    }).select('_id status submittedAt');

    if (duplicateApplication) {
      return res.status(409).json({
        success: false,
        message: 'This NIC has already submitted an application for the selected program.'
      });
    }
    
    // Process and save files to GridFS
    if (applicationData.documents) {
      const processedDocuments = {
        degreeCertificate: [],
        membershipProofs: [],
        employerLetter: []
      };
      
      // Process degree certificates (multiple files)
      if (applicationData.documents.degreeCertificate) {
        const degreeFiles = Array.isArray(applicationData.documents.degreeCertificate) 
          ? applicationData.documents.degreeCertificate 
          : [applicationData.documents.degreeCertificate];
        
        for (const file of degreeFiles) {
          if (file && file.data) {
            console.log(`💾 Saving degree certificate: ${file.name}`);
            const fileId = await saveFileToGridFS(
              file.name || 'degree_certificate.pdf',
              file.data,
              { type: 'degree', originalFileName: file.name }
            );
            processedDocuments.degreeCertificate.push(fileId);
            console.log(`✅ Saved degree certificate with ID: ${fileId}`);
          }
        }
      }
      
      // Process membership proofs (multiple files)
      if (applicationData.documents.membershipProofs) {
        const membershipFiles = Array.isArray(applicationData.documents.membershipProofs)
          ? applicationData.documents.membershipProofs
          : [applicationData.documents.membershipProofs];
        
        for (const file of membershipFiles) {
          if (file && file.data) {
            console.log(`💾 Saving membership proof: ${file.name}`);
            const fileId = await saveFileToGridFS(
              file.name || 'membership_proof.pdf',
              file.data,
              { type: 'membership', originalFileName: file.name }
            );
            processedDocuments.membershipProofs.push(fileId);
            console.log(`✅ Saved membership proof with ID: ${fileId}`);
          }
        }
      }
      
      // Process employer letters (multiple files)
      if (applicationData.documents.employerLetter) {
        const employerFiles = Array.isArray(applicationData.documents.employerLetter)
          ? applicationData.documents.employerLetter
          : [applicationData.documents.employerLetter];
        
        for (const file of employerFiles) {
          if (file && file.data) {
            console.log(`💾 Saving employer letter: ${file.name}`);
            const fileId = await saveFileToGridFS(
              file.name || 'employer_letter.pdf',
              file.data,
              { type: 'employer', originalFileName: file.name }
            );
            processedDocuments.employerLetter.push(fileId);
            console.log(`✅ Saved employer letter with ID: ${fileId}`);
          }
        }
      }
      
      // Process single-file documents
      if (applicationData.documents.nic && applicationData.documents.nic.data) {
        console.log(`💾 Saving NIC: ${applicationData.documents.nic.name}`);
        const fileId = await saveFileToGridFS(
          applicationData.documents.nic.name || 'nic.pdf',
          applicationData.documents.nic.data,
          { type: 'nic', originalFileName: applicationData.documents.nic.name }
        );
        processedDocuments.nic = fileId;
        console.log(`✅ Saved NIC with ID: ${fileId}`);
      }
      
      if (applicationData.documents.transcript && applicationData.documents.transcript.data) {
        console.log(`💾 Saving transcript: ${applicationData.documents.transcript.name}`);
        const fileId = await saveFileToGridFS(
          applicationData.documents.transcript.name || 'transcript.pdf',
          applicationData.documents.transcript.data,
          { type: 'transcript', originalFileName: applicationData.documents.transcript.name }
        );
        processedDocuments.transcript = fileId;
        console.log(`✅ Saved transcript with ID: ${fileId}`);
      }
      
      if (applicationData.documents.paymentConfirmation && applicationData.documents.paymentConfirmation.data) {
        console.log(`💾 Saving payment confirmation: ${applicationData.documents.paymentConfirmation.name}`);
        const fileId = await saveFileToGridFS(
          applicationData.documents.paymentConfirmation.name || 'payment_receipt.pdf',
          applicationData.documents.paymentConfirmation.data,
          { type: 'payment', originalFileName: applicationData.documents.paymentConfirmation.name }
        );
        processedDocuments.paymentConfirmation = fileId;
        console.log(`✅ Saved payment confirmation with ID: ${fileId}`);
      }
      
      // Replace original documents with GridFS IDs
      applicationData.documents = {
        degreeCertificate: processedDocuments.degreeCertificate.length > 0 ? processedDocuments.degreeCertificate : undefined,
        membershipProofs: processedDocuments.membershipProofs.length > 0 ? processedDocuments.membershipProofs : undefined,
        nic: processedDocuments.nic,
        employerLetter: processedDocuments.employerLetter.length > 0 ? processedDocuments.employerLetter : undefined,
        transcript: processedDocuments.transcript,
        paymentConfirmation: processedDocuments.paymentConfirmation
      };
    }
    
    console.log('💾 Saving application to database...');
    // Create new application with GridFS file IDs
    const application = new Application(applicationData);
    await application.save();
    
    console.log(`✅ Application saved successfully with ID: ${application._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        _id: application._id,
        fullName: application.fullName,
        program: application.program,
        status: application.status
      }
    });
  } catch (error) {
    console.error('❌ Error creating application:', error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This NIC has already submitted an application for the selected program.'
      });
    }

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

// Get lightweight application summaries (for fast admin lists/search)
router.get('/summary', async (req, res) => {
  try {
    const applications = await Application.find()
      .select(APPLICATION_SUMMARY_FIELDS)
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching application summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application summaries',
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
    console.error('Error fetching applications by program:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications by program',
      error: error.message
    });
  }
});

// Get lightweight summaries by program
router.get('/program/:program/summary', async (req, res) => {
  try {
    const { program } = req.params;
    const applications = await Application.find({ program })
      .select([
        '_id',
        'status',
        'fullName',
        'email',
        'mobile',
        'submittedAt'
      ].join(' '))
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching program summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching program summaries',
      error: error.message
    });
  }
});

// Get lightweight view of single application
router.get('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id)
      .select([
        'program',
        'title',
        'fullName',
        'nameWithInitials',
        'nicNo',
        'telephone',
        'mobile',
        'email',
        'contactAddress',
        'qualifications',
        'memberships',
        'experiences',
        'status',
        'submittedAt',
        'createdAt',
        'documents'
      ].join(' '))
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Process documents: convert file IDs to downloadable format with metadata
    const documents = application.documents || {};
    const processedDocuments = {};
    
    // Helper to get original filename from file ID
    const getFileInfo = async (fileId) => {
      if (!fileId) return null;
      try {
        const metadata = await getFileMetadata(fileId);
        return {
          fileId: fileId.toString(),
          fileName: metadata?.metadata?.originalFileName || `document_${fileId}.pdf`,
          uploadedAt: metadata?.uploadDate
        };
      } catch (error) {
        return {
          fileId: fileId.toString(),
          fileName: `document_${fileId}.pdf`
        };
      }
    };
    
    // Process each document type
    if (documents.degreeCertificate && Array.isArray(documents.degreeCertificate)) {
      processedDocuments.degreeCertificate = await Promise.all(
        documents.degreeCertificate.map(getFileInfo)
      );
    }
    
    if (documents.membershipProofs && Array.isArray(documents.membershipProofs)) {
      processedDocuments.membershipProofs = await Promise.all(
        documents.membershipProofs.map(getFileInfo)
      );
    }
    
    if (documents.employerLetter && Array.isArray(documents.employerLetter)) {
      processedDocuments.employerLetter = await Promise.all(
        documents.employerLetter.map(getFileInfo)
      );
    }
    
    if (documents.nic) {
      processedDocuments.nic = await getFileInfo(documents.nic);
    }
    
    if (documents.transcript) {
      processedDocuments.transcript = await getFileInfo(documents.transcript);
    }
    
    if (documents.paymentConfirmation) {
      processedDocuments.paymentConfirmation = await getFileInfo(documents.paymentConfirmation);
    }

    const lightweightApplication = {
      ...application,
      documents: processedDocuments
    };

    return res.json({
      success: true,
      data: lightweightApplication
    });
  } catch (error) {
    console.error('Error fetching application view data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching application view data',
      error: error.message
    });
  }
});

// Get full application details
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
    
    return res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return res.status(500).json({
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
    const { status } = req.body;

    const application = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    return res.json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
});

// Update marks
router.patch('/:id/marks', async (req, res) => {
  try {
    const { id } = req.params;
    const { oaMarks, writingMarks, interviewMarks, graduationDate } = req.body;

    const application = await Application.findByIdAndUpdate(
      id,
      { oaMarks, writingMarks, interviewMarks, graduationDate },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    return res.json({
      success: true,
      message: 'Marks updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating marks:', error);
    return res.status(500).json({
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

// Download file from GridFS
// Usage: GET /api/applications/:appId/file/:fileId
router.get('/:appId/file/:fileId', async (req, res) => {
  try {
    const { appId, fileId } = req.params;
    
    // Verify application exists (security check)
    const application = await Application.findById(appId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify file belongs to this application (basic check)
    const allFileIds = [
      ...(application.documents?.degreeCertificate || []),
      ...(application.documents?.membershipProofs || []),
      ...(application.documents?.employerLetter || []),
      application.documents?.nic,
      application.documents?.transcript,
      application.documents?.paymentConfirmation
    ].filter(id => id);
    
    if (!allFileIds.some(id => id.toString() === fileId)) {
      return res.status(403).json({
        success: false,
        message: 'File does not belong to this application'
      });
    }
    
    // Get file metadata for original filename
    const metadata = await getFileMetadata(fileId).catch(() => null);
    const originalFileName = metadata?.metadata?.originalFileName || `document_${fileId}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    
    // Stream file from GridFS
    const downloadStream = getFileStream(fileId);
    downloadStream.pipe(res);
    
    downloadStream.on('error', (error) => {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    console.error('Error in file download endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
});

// Bulk email endpoint
router.post('/program/:program/bulk-email', async (req, res) => {
  try {
    const { program } = req.params;
    const { subject, message } = req.body;

    // Get all applications for this program with status 'approved'
    const applications = await Application.find({ program, status: 'approved' });

    if (applications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No approved applications found for this program'
      });
    }

    // Send emails
    const emailResults = await sendBulkEmail(applications, subject, message);

    return res.json({
      success: true,
      message: `Emails sent to ${emailResults.successful} applicants`,
      data: emailResults
    });
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending bulk emails',
      error: error.message
    });
  }
});

export default router;

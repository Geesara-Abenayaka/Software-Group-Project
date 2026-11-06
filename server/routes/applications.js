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
import { parseGpa, isValidGpa, withGpaCategory, MAX_GPA } from '../utils/gpaCategory.js';
import { getApplicationWindow } from '../utils/applicationWindow.js';
import { APPLICATION_FEE, isStripeConfigured, markPaymentUsed, verifyApplicationFeePayment } from '../utils/stripePayments.js';
import { loadReceiptMatches } from '../utils/receiptMatches.js';
import { requireAdmin } from '../utils/adminAuth.js';

const router = express.Router();

// Loaded alongside list fields so each application's GPA category can be derived.
const GPA_FIELD = 'qualifications.gpa';

const ADMIN_LIST_FIELDS = [
  '_id',
  'program',
  'title',
  'fullName',
  'nameWithInitials',
  'nicNo',
  'telephone',
  'mobile',
  'email',
  'status',
  'oaMarks',
  'writingMarks',
  'interviewMarks',
  'graduationDate',
  'submittedAt',
  'createdAt',
  'updatedAt',
  'payment.method',
  'payment.status',
  'payment.amount'
].join(' ');

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
  'status',
  'oaMarks',
  'writingMarks',
  'interviewMarks',
  'graduationDate',
  'submittedAt',
  'createdAt',
  'updatedAt',
  // So the delete confirm can mention a card payment
  'payment.method',
  'payment.amount'
].join(' ');

// Create a new application
router.post('/', async (req, res) => {
  try {
    const applicationData = req.body;
    console.log('📥 Received application submission...');

    // Normalize key fields so duplicate checks are reliable.
    applicationData.program = String(applicationData.program || '').trim();
    applicationData.nicNo = String(applicationData.nicNo || '').trim().toUpperCase();

    // Refuse applications outside the period set in Settings or after the program's deadline.
    const program = await Program.findOne({ shortCode: applicationData.program }).select('applicationDeadline').lean();
    const applicationWindow = await getApplicationWindow(program);
    if (!applicationWindow.open) {
      return res.status(403).json({ success: false, message: applicationWindow.message });
    }

    // Check GPAs before any files are written, so a rejected application leaves no orphaned uploads.
    if (Array.isArray(applicationData.qualifications)) {
      applicationData.qualifications = applicationData.qualifications.map((qualification) => ({
        ...qualification,
        gpa: parseGpa(qualification?.gpa)
      }));

      if (!applicationData.qualifications.every((qualification) => isValidGpa(qualification.gpa))) {
        return res.status(400).json({
          success: false,
          message: `GPA must be a number between 0 and ${MAX_GPA}.`
        });
      }
    }

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

    // A card payment is only trusted after Stripe confirms it; the browser can't set `payment` itself.
    const paymentIntentId = String(applicationData.onlinePayment?.paymentIntentId || '').trim();
    delete applicationData.onlinePayment;
    delete applicationData.paymentMethod;
    delete applicationData.payment;

    if (paymentIntentId) {
      if (!isStripeConfigured()) {
        return res.status(503).json({ success: false, message: 'Card payments cannot be checked right now. Please try again later.' });
      }

      const paymentCheck = await verifyApplicationFeePayment(paymentIntentId, applicationData.program);
      const usedBefore = paymentCheck.ok && await Application.exists({ 'payment.stripePaymentIntentId': paymentIntentId });
      if (!paymentCheck.ok || usedBefore) {
        return res.status(402).json({
          success: false,
          message: paymentCheck.message || 'This card payment has already been used for another application.'
        });
      }

      applicationData.payment = paymentCheck.payment;
      // The card payment replaces the bank receipt.
      if (applicationData.documents) {
        delete applicationData.documents.paymentConfirmation;
      }
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

    if (application.payment?.stripePaymentIntentId) {
      // Not awaited: the application is saved either way, and the database check above also stops reuse.
      markPaymentUsed(application.payment.stripePaymentIntentId, application._id)
        .catch((error) => console.error('Could not link the payment to the application in Stripe:', error.message));
    }

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
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, program, status } = req.query;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const query = {};
    if (program) query.program = String(program);
    if (status) query.status = String(status);

    const applicationsQuery = Application.find(query)
      .select(`${ADMIN_LIST_FIELDS} ${GPA_FIELD}`)
      .sort({ submittedAt: -1 })
      .lean();

    if (hasPagination) {
      applicationsQuery.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
    }

    const applications = await applicationsQuery;
    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      data: applications.map((application) => withGpaCategory(application, { keepQualifications: false })),
      count: applications.length,
      total,
      page: hasPagination ? parsedPage : null,
      limit: hasPagination ? parsedLimit : null
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
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const applications = await Application.find()
      .select(`${APPLICATION_SUMMARY_FIELDS} ${GPA_FIELD}`)
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: applications.map((application) => withGpaCategory(application, { keepQualifications: false })),
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
router.get('/program/:program', requireAdmin, async (req, res) => {
  try {
    const { program } = req.params;
    const applications = await Application.find({ program })
      .select(`${ADMIN_LIST_FIELDS} ${GPA_FIELD}`)
      .sort({ submittedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: applications.map((application) => withGpaCategory(application, { keepQualifications: false })),
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

// Lightweight summary endpoint for admin dashboards
router.get('/summary/by-program', requireAdmin, async (req, res) => {
  try {
    // Statuses are stored in more than one spelling ('approved' and 'Approved', 'Rejected', 'Application Rejected'),
    // so compare them in lower case.
    const status = { $toLower: '$status' };

    const summary = await Application.aggregate([
      {
        $group: {
          _id: '$program',
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: [status, 'pending'] }, 1, 0]
            }
          },
          approved: {
            $sum: {
              $cond: [{ $eq: [status, 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $in: [status, ['rejected', 'application rejected']] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          program: '$_id',
          total: 1,
          pending: 1,
          approved: 1,
          rejected: 1
        }
      }
    ]);

    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching application summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching application summary',
      error: error.message
    });
  }
});

// Fast lookup by NIC for admin marks page
router.get('/nic/:nicNo', requireAdmin, async (req, res) => {
  try {
    const { nicNo } = req.params;
    const normalizedNic = String(nicNo || '').trim();

    if (!normalizedNic) {
      return res.status(400).json({
        success: false,
        message: 'NIC is required'
      });
    }

    const application = await Application.findOne({ nicNo: normalizedNic })
      .select(ADMIN_LIST_FIELDS + ' qualifications')
      .sort({ submittedAt: -1 })
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found for NIC'
      });
    }

    return res.json({
      success: true,
      data: withGpaCategory(application)
    });
  } catch (error) {
    console.error('Error fetching application by NIC:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching application by NIC',
      error: error.message
    });
  }
});

// Get lightweight summaries by program
router.get('/program/:program/summary', requireAdmin, async (req, res) => {
  try {
    const { program } = req.params;
    const applications = await Application.find({ program })
      .select([
        '_id',
        'program',
        'status',
        'nicNo',
        'fullName',
        'nameWithInitials',
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
router.get('/:id/view', requireAdmin, async (req, res) => {
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
        'documents',
        'payment'
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
    
    // Other applications that uploaded the same bank receipt (one bank payment pays one fee).
    let receiptMatches = [];
    if (documents.paymentConfirmation) {
      processedDocuments.paymentConfirmation = await getFileInfo(documents.paymentConfirmation);
      if (application.payment?.method !== 'card') {
        receiptMatches = (await loadReceiptMatches()).get(String(application._id)) || [];
      }
    }

    const lightweightApplication = {
      ...withGpaCategory(application),
      documents: processedDocuments,
      receiptMatches
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
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).lean();
    
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
router.patch('/:id/status', requireAdmin, async (req, res) => {
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
router.patch('/:id/marks', requireAdmin, async (req, res) => {
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

// An admin checks an uploaded bank receipt against the bank statement.
// Body: { action: 'confirm' | 'reject' | 'reset', note? }. Saves the signed-in admin as the one who checked it.
// confirm: the fee counts as paid and collected; reject: the application counts as not paid;
// reset: back to "not checked yet".
const PAYMENT_REVIEW_ACTIONS = ['confirm', 'reject', 'reset'];

router.patch('/:id/payment', requireAdmin, async (req, res) => {
  const action = String(req.body?.action || '');
  if (!PAYMENT_REVIEW_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, message: 'The action must be confirm, reject or reset.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  try {
    const application = await Application.findById(req.params.id)
      .select('payment.method documents.paymentConfirmation')
      .lean();

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (application.payment?.method === 'card') {
      return res.status(409).json({ success: false, message: 'This application was paid by card, so there is no bank receipt to check.' });
    }
    if (!application.documents?.paymentConfirmation) {
      return res.status(409).json({ success: false, message: 'This application has no bank receipt to check.' });
    }

    const review = {
      method: 'bank',
      status: action === 'confirm' ? 'confirmed' : 'rejected',
      currency: APPLICATION_FEE.currency.toUpperCase(),
      // The signed-in admin, from the session (never from the request body)
      reviewedBy: req.admin.email,
      reviewedAt: new Date(),
      note: String(req.body?.note || '').trim().slice(0, 500)
    };
    if (action === 'confirm') {
      review.amount = APPLICATION_FEE.amount;
    }

    // The condition stops this from replacing a card payment saved at the same moment.
    const updated = await Application.findOneAndUpdate(
      { _id: req.params.id, 'payment.method': { $ne: 'card' } },
      action === 'reset' ? { $unset: { payment: 1 } } : { $set: { payment: review } },
      { new: true, projection: { payment: 1 } }
    ).lean();

    if (!updated) {
      return res.status(409).json({ success: false, message: 'This application was paid by card, so there is no bank receipt to check.' });
    }

    const messages = {
      confirm: 'Bank payment confirmed',
      reject: 'Bank receipt rejected',
      reset: 'Bank receipt marked as not checked'
    };
    return res.json({ success: true, message: messages[action], data: { payment: updated.payment || null } });
  } catch (error) {
    console.error('Error reviewing bank receipt:', error);
    return res.status(500).json({ success: false, message: 'Could not save the receipt check. Please try again.' });
  }
});

// Delete application
router.delete('/:id', requireAdmin, async (req, res) => {
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
router.get('/:appId/file/:fileId', requireAdmin, async (req, res) => {
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
router.post('/program/:program/bulk-email', requireAdmin, async (req, res) => {
  try {
    const { program } = req.params;
    const { subject, message, applicationIds = [] } = req.body;

    const normalizedApplicationIds = Array.isArray(applicationIds)
      ? applicationIds.filter(Boolean)
      : [];

    const query = { program };
    if (normalizedApplicationIds.length > 0) {
      query._id = { $in: normalizedApplicationIds };
    } else {
      query.status = 'approved';
    }

    const applications = await Application.find(query);

    if (applications.length === 0) {
      const messageText = normalizedApplicationIds.length > 0
        ? 'No matching applications found for the selected recipients'
        : 'No approved applications found for this program';

      return res.status(400).json({
        success: false,
        message: messageText
      });
    }

    const programQuery = mongoose.Types.ObjectId.isValid(program)
      ? { $or: [{ _id: program }, { shortCode: program }] }
      : { shortCode: program };

    const programRecord = await Program.findOne(programQuery).select('title shortCode');

    const recipients = applications.map((application) => ({
      applicationId: application._id.toString(),
      fullName: application.fullName,
      email: application.email,
      status: application.status,
      program: application.program
    }));

    // Send emails
    const emailResults = await sendBulkEmail({
      recipients,
      subject,
      content: message,
      programName: programRecord?.title || programRecord?.shortCode || program
    });

    return res.json({
      success: true,
      message: `Emails sent to ${emailResults.sentCount} recipient(s)`,
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

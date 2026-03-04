import { jsPDF } from 'jspdf';

/**
 * Generate and download a PDF with course/program details
 * @param {Object} program - The program object containing all details
 */
export const generateCourseDetailsPDF = (program) => {
  // Create a new PDF document (A4 size)
  const doc = new jsPDF();
  
  // Set up colors and fonts
  const primaryColor = [0, 51, 102]; // Dark blue
  const secondaryColor = [100, 100, 100]; // Gray
  
  let yPosition = 20;
  const leftMargin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 40;
  
  // Add header with university name
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('University of Moratuwa', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Postgraduate Management Information System', pageWidth / 2, 25, { align: 'center' });
  
  yPosition = 50;
  
  // Program Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(program.title, leftMargin, yPosition);
  yPosition += 10;
  
  // Add a line separator
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPosition, pageWidth - leftMargin, yPosition);
  yPosition += 10;
  
  // Program Description
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const description = program.detailedDescription || program.description;
  const descriptionLines = doc.splitTextToSize(description, contentWidth);
  doc.text(descriptionLines, leftMargin, yPosition);
  yPosition += descriptionLines.length * 7 + 10;
  
  // Specializations Section
  if (program.specializations && program.specializations.length > 0) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Available Specializations', leftMargin, yPosition);
    yPosition += 8;
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    program.specializations.forEach((spec, index) => {
      doc.text(`• ${spec.name}`, leftMargin + 5, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }
  
  // Deadlines Section
  if (program.deadlines) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Important Deadlines', leftMargin, yPosition);
    yPosition += 8;
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    if (program.deadlines.application) {
      doc.text(`Application Deadline: ${program.deadlines.application}`, leftMargin + 5, yPosition);
      yPosition += 7;
    }
    
    if (program.deadlines.selectionExams) {
      const examLines = doc.splitTextToSize(`Selection Exams: ${program.deadlines.selectionExams}`, contentWidth - 5);
      doc.text(examLines, leftMargin + 5, yPosition);
      yPosition += examLines.length * 7 + 5;
    }
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text('For more information, visit the University of Moratuwa website', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Save the PDF
  const fileName = `${program.shortCode}-course-details.pdf`;
  doc.save(fileName);
};

/**
 * Generate and download an official "Call for Application" letter
 * @param {Object} program - The program object containing all details
 */
export const generateCallForApplicationPDF = (program) => {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 25;
  const rightMargin = 25;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  let yPosition = 20;
  
  // University Logo/Header area (placeholder with text)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('UNIVERSITY OF MORATUWA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Faculty of Engineering', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Katubedda, Moratuwa 10400, Sri Lanka', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('Tel: +94 11 2650301 | Email: pgis@uom.lk | Web: www.uom.lk', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  // Separator line
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
  yPosition += 15;
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(`Date: ${currentDate}`, leftMargin, yPosition);
  yPosition += 15;
  
  // Subject line - bold and centered
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  const subjectText = `CALL FOR APPLICATIONS - ${program.title.toUpperCase()}`;
  const subjectLines = doc.splitTextToSize(subjectText, contentWidth);
  subjectLines.forEach(line => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
  });
  yPosition += 10;
  
  // Letter body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Opening paragraph
  const openingText = `The Faculty of Engineering, University of Moratuwa invites applications from suitably qualified candidates for admission to the ${program.title} degree program for the academic year ${new Date().getFullYear()}/${new Date().getFullYear() + 1}.`;
  let lines = doc.splitTextToSize(openingText, contentWidth);
  lines.forEach(line => {
    doc.text(line, leftMargin, yPosition);
    yPosition += 6;
  });
  yPosition += 8;
  
  // Program description
  doc.setFont('helvetica', 'bold');
  doc.text('Program Overview:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  const description = program.detailedDescription || program.description;
  lines = doc.splitTextToSize(description, contentWidth);
  lines.forEach(line => {
    doc.text(line, leftMargin, yPosition);
    yPosition += 6;
  });
  yPosition += 8;
  
  // Specializations
  if (program.specializations && program.specializations.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Available Specializations:', leftMargin, yPosition);
    yPosition += 7;
    
    doc.setFont('helvetica', 'normal');
    program.specializations.forEach((spec) => {
      doc.text(`• ${spec.name}`, leftMargin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 8;
  }
  
  // Deadlines section
  if (program.deadlines) {
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 0, 0); // Red color for important deadlines
    doc.text('Important Dates:', leftMargin, yPosition);
    yPosition += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    if (program.deadlines.application) {
      lines = doc.splitTextToSize(`Application Deadline: ${program.deadlines.application}`, contentWidth);
      lines.forEach(line => {
        doc.text(line, leftMargin + 5, yPosition);
        yPosition += 6;
      });
    }
    
    if (program.deadlines.selectionExams) {
      lines = doc.splitTextToSize(`Selection Exams and Interviews: ${program.deadlines.selectionExams}`, contentWidth);
      lines.forEach(line => {
        doc.text(line, leftMargin + 5, yPosition);
        yPosition += 6;
      });
    }
    yPosition += 10;
  }
  
  // Application instructions
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102);
  doc.text('How to Apply:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const applicationSteps = [
    'Complete the online application form available on our website',
    'Upload all required supporting documents',
    'Pay the application fee as per the instructions',
    'Submit the application before the deadline'
  ];
  
  applicationSteps.forEach((step, index) => {
    const stepText = `${index + 1}. ${step}`;
    lines = doc.splitTextToSize(stepText, contentWidth - 5);
    lines.forEach(line => {
      doc.text(line, leftMargin + 5, yPosition);
      yPosition += 6;
    });
  });
  yPosition += 10;
  
  // Contact information
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('For Further Information:', leftMargin, yPosition);
  yPosition += 7;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Postgraduate Studies Office', leftMargin + 5, yPosition);
  yPosition += 6;
  doc.text('Faculty of Engineering, University of Moratuwa', leftMargin + 5, yPosition);
  yPosition += 6;
  doc.text('Email: pgis@uom.lk', leftMargin + 5, yPosition);
  yPosition += 6;
  doc.text('Tel: +94 11 2650301', leftMargin + 5, yPosition);
  yPosition += 15;
  
  // Closing signature area
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('Dean', leftMargin, yPosition);
  yPosition += 5;
  doc.text('Faculty of Engineering', leftMargin, yPosition);
  yPosition += 5;
  doc.text('University of Moratuwa', leftMargin, yPosition);
  
  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  const footerText = 'This is a computer-generated document. For official correspondence, please contact the university.';
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  
  // Save the PDF
  const fileName = `${program.shortCode}-call-for-application.pdf`;
  doc.save(fileName);
};

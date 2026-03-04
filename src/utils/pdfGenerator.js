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

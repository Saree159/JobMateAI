import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Export applications to CSV file
 * @param {Array} applications - Array of application objects
 */
export const exportToCSV = (applications) => {
  if (!applications || applications.length === 0) {
    throw new Error('No applications to export');
  }

  // Prepare data for CSV
  const csvData = applications.map(app => ({
    'Job Title': app.title || '',
    'Company': app.company || '',
    'Location': app.location || '',
    'Status': app.status || '',
    'Match Score': app.match_score ? `${app.match_score}%` : 'N/A',
    'Applied Date': app.applied_date ? new Date(app.applied_date).toLocaleDateString() : 'N/A',
    'Interview Date': app.interview_date ? new Date(app.interview_date).toLocaleDateString() : 'N/A',
    'Apply URL': app.apply_url || '',
    'Notes': app.notes || '',
    'Created': new Date(app.created_at).toLocaleDateString(),
  }));

  // Convert to CSV string
  const csv = Papa.unparse(csvData);

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `job-applications-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export applications to PDF file
 * @param {Array} applications - Array of application objects
 */
export const exportToPDF = (applications) => {
  if (!applications || applications.length === 0) {
    throw new Error('No applications to export');
  }

  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('Job Applications Report', 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Add summary stats
  const stats = {
    total: applications.length,
    saved: applications.filter(a => a.status === 'saved').length,
    applied: applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };
  
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`Summary: ${stats.total} Total | ${stats.applied} Applied | ${stats.interview} Interview | ${stats.offer} Offer`, 14, 38);
  
  // Prepare table data
  const tableData = applications.map(app => [
    app.title || 'N/A',
    app.company || 'N/A',
    app.status || 'N/A',
    app.match_score ? `${app.match_score}%` : 'N/A',
    app.applied_date ? new Date(app.applied_date).toLocaleDateString() : 'N/A',
    app.interview_date ? new Date(app.interview_date).toLocaleDateString() : 'N/A',
  ]);
  
  // Add table
  doc.autoTable({
    startY: 45,
    head: [['Job Title', 'Company', 'Status', 'Match', 'Applied', 'Interview']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo color
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 45 }, // Job Title
      1: { cellWidth: 35 }, // Company
      2: { cellWidth: 25 }, // Status
      3: { cellWidth: 20 }, // Match
      4: { cellWidth: 25 }, // Applied
      5: { cellWidth: 25 }, // Interview
    },
    margin: { top: 45 },
  });
  
  // Add page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  doc.save(`job-applications-${new Date().toISOString().split('T')[0]}.pdf`);
};

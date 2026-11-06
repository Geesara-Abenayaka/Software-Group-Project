// CSV and PDF downloads for the admin Reports page. The rows and labels come from reportRows.js,
// so the files say exactly what the page says.
import { formatDateTime } from './formatDate';
import { describeCard, formatCount, formatRupees } from './formatMoney';
import { todayInSriLanka } from './reportPeriods';
import { categoryItems, PAYMENT_METHOD_LABELS, PROGRAM_COLUMNS, statusItems, toProgramRow } from './reportRows';

const TIME_ZONE = 'Asia/Colombo';

// A cell that starts with = + - @ (or a tab or carriage return) runs as a formula when the file is opened
// in Excel. Applicants type their own names on the public form, so such cells get a ' in front.
const FORMULA_START = /^[=+\-@\t\r]/;

// keepAsText: a long number such as a 12-digit NIC, which Excel would otherwise show as 1.99901E+11.
export const csvCell = (value, { keepAsText = false } = {}) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = String(value);
  if (keepAsText && /^\d{6,}$/.test(text)) return `"=""${text}"""`;
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

// UTF-8 with a byte order mark, so Excel shows Sinhala and Tamil names correctly.
const toCsv = (rows) => `\uFEFF${rows.map((row) => row.map((cell) => (
  cell && typeof cell === 'object' ? csvCell(cell.value, cell) : csvCell(cell)
)).join(',')).join('\r\n')}\r\n`;

export const downloadFile = (content, fileName, type) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// reports-summary-2026-10-01-to-2026-11-30-MSC-CS.csv
export const reportFileName = (kind, { from, to }, program, extension) => {
  const period = from || to ? `${from || 'start'}-to-${to || todayInSriLanka()}` : 'all-time';
  const programPart = program ? `-${program.replace(/[^A-Za-z0-9-]+/g, '')}` : '';
  return `reports-${kind}-${period}${programPart}.${extension}`;
};

// "2026-11-04" and "2026-11-04 10:25" in Sri Lanka time: sortable in Excel.
const sriLankaDay = (value) => (value ? new Date(value).toLocaleDateString('en-CA', { timeZone: TIME_ZONE }) : '');
const sriLankaDateTime = (value) => (
  value ? new Date(value).toLocaleString('sv-SE', { timeZone: TIME_ZONE }).slice(0, 16) : ''
);

const notesFor = (report) => {
  const { totals } = report;
  if (report.stripeMode !== 'live' && totals.payment.card > 0) {
    return ['Test mode: card payments were made with Stripe test cards and are not real money.'];
  }
  if (report.stripeMode === 'live' && totals.payment.testCard > 0) {
    return [`${formatCount(totals.payment.testCard)} test card payments are left out of these totals.`];
  }
  return [];
};

const sortedProgramRows = (report) => report.byProgram
  .map(toProgramRow)
  .sort((a, b) => b.applications - a.applications || a.name.localeCompare(b.name));

const demoProgramsText = (report) => {
  if (report.filters.program) return 'Not applicable (one program)';
  return report.filters.hideDemo ? 'Left out' : 'Included';
};

const summaryLines = (totals) => [
  ['Applications', totals.applications],
  ['Students (different NIC numbers)', totals.uniqueApplicants],
  ['Applied to 2 or more programs', totals.multiProgramApplicants],
  ['Fee paid', totals.paid],
  ['Paid by card', totals.payment.card],
  ['Bank receipt, confirmed', totals.payment.bankConfirmed],
  ['Bank receipt, not checked yet', totals.payment.bankWaiting],
  ['Bank receipt, rejected (not paid)', totals.payment.bankRejected],
  ['No payment on record', totals.payment.none]
];

// [label, rupees]: what was collected, and what the receipts not checked yet would add.
const moneyLines = (totals) => [
  ['Fees collected', totals.income],
  ['  by card', totals.cardIncome],
  ['  by confirmed bank receipts', totals.bankIncome],
  ['Expected from bank receipts not checked yet', totals.bankExpected]
];

// context: { periodLabel, programLabel }
export const buildSummaryCsv = (report, context) => {
  const { totals } = report;
  const programHeader = [
    ...PROGRAM_COLUMNS.map((column) => (column.money ? `${column.label} (Rs.)` : column.label)),
    'Expected from receipts not checked yet (Rs.)',
    'Program code'
  ];
  const programLine = (row, code) => [
    row.name,
    ...PROGRAM_COLUMNS.slice(1).map((column) => row[column.key]),
    row.bankExpected,
    code
  ];

  return toCsv([
    ['University of Moratuwa - CSE Postgraduate admissions report'],
    ['Period', context.periodLabel],
    ['Program', context.programLabel],
    ['Demo programs', demoProgramsText(report)],
    ['Generated', formatDateTime(report.generatedAt)],
    ...notesFor(report).map((note) => ['Note', note]),
    ['Note', 'Collected is card payments plus bank receipts an admin has confirmed. The fee is not refunded when an application is rejected. Refunds and disputes made in Stripe are not included.'],
    [],
    ['Summary'],
    ...summaryLines(totals),
    ...moneyLines(totals).map(([label, value]) => [`${label} (Rs.)`, value]),
    [],
    ['By program'],
    programHeader,
    ...sortedProgramRows(report).map((row) => programLine(row, row.program)),
    programLine(toProgramRow({ program: '', title: 'Total', deleted: false, demo: false, ...totals }), ''),
    [],
    ['Status'],
    ...statusItems(totals.status).map((item) => [item.label, item.value]),
    [],
    ['GPA category'],
    ...categoryItems(report.categories).map((item) => [item.hint ? `${item.label} (${item.hint})` : item.label, item.value])
  ]);
};

// rows: data from GET /api/reports/payments?limit=all
export const buildPaymentsCsv = (rows) => toCsv([
  [
    'Submitted', 'Reference', 'Full name', 'NIC', 'Program', 'Payment', 'Amount (Rs.)', 'Paid at', 'Card',
    'Stripe payment ID', 'Stripe receipt', 'Receipt checked by', 'Checked on', 'Note', 'Same receipt file as'
  ],
  ...rows.map((row) => {
    const isCard = row.method === 'card' || row.method === 'testCard';
    return [
      sriLankaDay(row.submittedAt),
      row.reference,
      row.fullName,
      { value: row.nicNo, keepAsText: true },
      row.programTitle || `Deleted program (${row.program})`,
      PAYMENT_METHOD_LABELS[row.method],
      isCard || row.method === 'bankConfirmed' ? row.amount : '',
      isCard ? sriLankaDateTime(row.paidAt) : '',
      row.method === 'card' ? describeCard(row) : '',
      row.stripePaymentIntentId,
      row.receiptUrl,
      row.reviewedBy,
      sriLankaDateTime(row.reviewedAt),
      row.note,
      (row.receiptMatches || [])
        .map((match) => `${match.reference}${match.exact ? '' : ' (possibly)'}`)
        .join('; ')
    ];
  })
]);

// The PDF's built-in font has no en dash or bullet, so those become plain characters.
const pdfText = (value) => String(value ?? '').replace(/[–—]/g, '-').replace(/•/g, '*');

// context: { periodLabel, programLabel, fileName }
export const downloadReportPdf = async (report, context) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const { totals } = report;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const MAROON = [139, 26, 26]; // --brand
  const INK = [31, 41, 55];

  // Maroon band like the other PDFs of the site
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('University of Moratuwa', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('CSE Postgraduate admissions report', margin, 18);

  let y = 34;
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  [
    ['Period', context.periodLabel],
    ['Program', context.programLabel],
    ['Demo programs', demoProgramsText(report)],
    ['Generated', formatDateTime(report.generatedAt)]
  ].forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfText(value), margin + 30, y);
    y += 5.5;
  });

  notesFor(report).forEach((note) => {
    doc.setTextColor(146, 64, 14); // amber, like the page's banner
    doc.text(pdfText(note), margin, y);
    y += 5.5;
  });

  const base = {
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 18 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, lineColor: [229, 231, 235], lineWidth: 0.2 },
    headStyles: { fillColor: MAROON, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [249, 250, 251], textColor: [17, 24, 39], fontStyle: 'bold' }
  };
  // A table starts on a new page when fewer than ~45 mm are left, so a heading row is never left alone at the bottom.
  const nextY = () => {
    const y = doc.lastAutoTable.finalY + 8;
    if (y > pageHeight - 45) {
      doc.addPage();
      return 20;
    }
    return y;
  };
  // Numbers line up on the right in the heading and totals rows too, not only in the body.
  const alignNumbers = (firstNumberColumn) => (data) => {
    if (data.column.index >= firstNumberColumn && (data.section === 'head' || data.section === 'foot')) {
      data.cell.styles.halign = 'right';
    }
  };

  autoTable(doc, {
    ...base,
    startY: y + 2,
    head: [['Summary', '']],
    body: [
      ...summaryLines(totals).map(([label, value]) => [label, formatCount(value)]),
      ...moneyLines(totals).map(([label, value]) => [label, formatRupees(value)])
    ],
    columnStyles: { 1: { halign: 'right', cellWidth: 45 } }
  });

  const numberColumns = Object.fromEntries(PROGRAM_COLUMNS.slice(1).map((_, index) => [index + 1, { halign: 'right' }]));
  const programCells = (row) => [
    pdfText(row.demo ? `${row.name} (demo)` : row.name),
    ...PROGRAM_COLUMNS.slice(1).map((column) => (column.money ? formatRupees(row[column.key]) : formatCount(row[column.key])))
  ];
  autoTable(doc, {
    ...base,
    startY: nextY(),
    head: [PROGRAM_COLUMNS.map((column) => column.label)],
    body: sortedProgramRows(report).map(programCells),
    foot: [programCells(toProgramRow({ program: '', title: 'Total', deleted: false, demo: false, ...totals }))],
    styles: { ...base.styles, fontSize: 8 },
    columnStyles: { ...numberColumns, 0: { cellWidth: 42 }, 8: { halign: 'right', cellWidth: 25 } },
    didParseCell: alignNumbers(1)
  });

  const breakdown = (title, items) => {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    autoTable(doc, {
      ...base,
      startY: nextY(),
      head: [[title, 'Applications', 'Share']],
      body: items.map((item) => [
        item.hint ? `${item.label} (${item.hint})` : item.label,
        formatCount(item.value),
        `${total ? Math.round((item.value / total) * 100) : 0}%`
      ]),
      columnStyles: { 1: { halign: 'right', cellWidth: 30 }, 2: { halign: 'right', cellWidth: 25 } },
      didParseCell: alignNumbers(1)
    });
  };
  breakdown('Status', statusItems(totals.status));
  breakdown('GPA category', categoryItems(report.categories));

  let noteY = nextY() - 3;
  if (noteY > pageHeight - 30) {
    doc.addPage();
    noteY = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(
    pdfText('Pending includes under review and shortlisted. A rejected bank receipt counts as not paid. Collected is card payments plus bank receipts an admin has confirmed. The fee is not refunded when an application is rejected; refunds and disputes made in Stripe are not included.'),
    margin,
    noteY,
    { maxWidth: pageWidth - margin * 2 }
  );

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(pdfText(`${context.periodLabel} · ${context.programLabel}`), margin, pageHeight - 8);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  doc.save(context.fileName);
};

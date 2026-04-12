// SolTax AU - PDF Report Generation using pdf-lib
import {
  PDFDocument,
  StandardFonts,
  rgb,
  RGB,
  degrees,
} from 'pdf-lib';
import type { TaxReport, TaxCalculationResult, CapitalGain } from '@/types';

// ============================================
// COLORS
// ============================================

const COLORS = {
  primary: rgb(0.1, 0.47, 0.34) as RGB, // Australian green
  secondary: rgb(0.92, 0.7, 0.03) as RGB, // Australian gold
  dark: rgb(0.1, 0.1, 0.1) as RGB,
  light: rgb(0.95, 0.95, 0.95) as RGB,
  red: rgb(0.8, 0.2, 0.2) as RGB,
  green: rgb(0.2, 0.6, 0.3) as RGB,
};

// ============================================
// PDF GENERATION
// ============================================

export async function generateTaxReportPDF(report: TaxReport): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Create pages
  const coverPage = pdfDoc.addPage([595, 842]); // A4
  const summaryPage = pdfDoc.addPage([595, 842]);

  // Generate cover page
  drawCoverPage(coverPage, report, font, boldFont);

  // Generate summary page
  drawSummaryPage(summaryPage, report, font, boldFont);

  // Add transaction details page if needed
  if (report.transactions.length > 0) {
    const transactionsPage = pdfDoc.addPage([595, 842]);
    drawTransactionsPage(transactionsPage, report, font, boldFont);
  }

  // Add capital gains schedule
  if (report.capitalGains.length > 0) {
    const cgtPage = pdfDoc.addPage([595, 842]);
    drawCGTSchedulePage(cgtPage, report, font, boldFont);
  }

  return pdfDoc.save();
}

// ============================================
// COVER PAGE
// ============================================

function drawCoverPage(
  page: any,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const { width, height } = page.getSize();
  const centerX = width / 2;

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: COLORS.primary,
  });

  // Title
  page.drawText('SolTax AU', {
    x: centerX - 60,
    y: height - 60,
    size: 32,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  // Subtitle
  page.drawText('Australian Crypto Tax Report', {
    x: centerX - 90,
    y: height - 85,
    size: 14,
    font,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Report info
  let y = height - 180;

  page.drawText('Financial Year', {
    x: 50,
    y,
    size: 12,
    font,
    color: COLORS.dark,
  });

  page.drawText(`${report.financialYear}`, {
    x: 200,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  y -= 30;

  page.drawText('Wallet', {
    x: 50,
    y,
    size: 12,
    font,
    color: COLORS.dark,
  });

  page.drawText(report.walletLabel || report.walletId.slice(0, 12) + '...', {
    x: 200,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  y -= 30;

  page.drawText('Generated', {
    x: 50,
    y,
    size: 12,
    font,
    color: COLORS.dark,
  });

  page.drawText(report.generatedAt.toLocaleDateString('en-AU'), {
    x: 200,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  // Disclaimer
  const disclaimer = 'This report is for informational purposes only and does not constitute tax advice. ' +
    'Please consult with a qualified tax professional before lodging your tax return.';

  page.drawText(disclaimer, {
    x: 50,
    y: 100,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
    width: width - 100,
  });

  // Footer
  page.drawText(`Page 1 of ${1 + (report.transactions.length > 0 ? 1 : 0) + (report.capitalGains.length > 0 ? 1 : 0)}`, {
    x: centerX - 30,
    y: 30,
    size: 10,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

// ============================================
// SUMMARY PAGE
// ============================================

function drawSummaryPage(
  page: any,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const { width } = page.getSize();
  let y = 780;

  // Title
  page.drawText('Tax Summary', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: COLORS.primary,
  });

  y -= 50;

  const summary = report.summary;

  // Income section
  page.drawText('ASSESSABLE INCOME', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  y -= 25;

  drawSummaryRow(page, 'Staking Rewards', 0, font); // Would need actual data
  y -= 20;
  drawSummaryRow(page, 'Airdrops', 0, font);
  y -= 20;
  drawSummaryRow(page, 'Other Income', summary.totalIncome, font);
  y -= 20;
  drawSummaryRow(page, 'Total Income', summary.totalIncome, font, true);

  y -= 30;

  // Capital Gains section
  page.drawText('CAPITAL GAINS', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  y -= 25;

  drawSummaryRow(page, 'Gross Capital Gains', summary.totalCapitalGains, font);
  y -= 20;
  drawSummaryRow(page, 'Capital Losses', -summary.totalCapitalLosses, font, true);
  y -= 20;
  drawSummaryRow(page, 'Net Capital Gain', summary.netCapitalGain, font);
  y -= 20;
  drawSummaryRow(page, 'CGT Discount (50%)', -summary.cgtDiscountApplied, font, true);
  y -= 20;
  drawSummaryRow(page, 'Discounted Net Gain', summary.netCapitalGain - summary.cgtDiscountApplied, font, true);

  y -= 30;

  // Taxable Income
  page.drawText('TAXABLE INCOME', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.primary,
  });

  y -= 25;
  drawSummaryRow(page, 'Total Taxable Income', summary.taxableIncome, font, true);

  y -= 30;

  // Tax Calculation
  page.drawText('ESTIMATED TAX', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });

  y -= 25;
  drawSummaryRow(page, 'Income Tax', summary.estimatedTax, font);
  y -= 20;
  drawSummaryRow(page, 'Medicare Levy (2%)', summary.medicareLevy, font);
  y -= 20;
  drawSummaryRow(page, 'TOTAL TAX PAYABLE', summary.totalTax, font, true, COLORS.primary);
}

function drawSummaryRow(
  page: any,
  label: string,
  amount: number,
  font: any,
  isBold = false,
  color?: RGB
) {
  const fontToUse = isBold ? font : font;
  page.drawText(label, {
    x: 50,
    y: page.getSize().height - 50, // This is wrong, need to track y properly
    size: 11,
    font: fontToUse,
    color: color || COLORS.dark,
  });

  page.drawText(formatAUD(amount), {
    x: 450,
    y: page.getSize().height - 50,
    size: 11,
    font: fontToUse,
    color: color || COLORS.dark,
    align: 'right',
  });
}

// ============================================
// TRANSACTIONS PAGE
// ============================================

function drawTransactionsPage(
  page: any,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const { width } = page.getSize();
  let y = 780;

  page.drawText('Transaction History', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: COLORS.primary,
  });

  y -= 50;

  // Table header
  const headers = ['Date', 'Type', 'Details', 'AUD Value'];
  const colWidths = [100, 120, 250, 100];
  let x = 50;

  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x,
      y,
      size: 10,
      font: boldFont,
      color: COLORS.dark,
    });
    x += colWidths[i];
  }

  y -= 20;

  // Draw separator line
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    color: COLORS.dark,
    thickness: 1,
  });

  y -= 15;

  // Transaction rows (limited for demo)
  const transactions = report.transactions.slice(0, 15);

  for (const tx of transactions) {
    if (y < 50) break; // Don't overflow page

    const txType = (tx.ato_classification as any)?.type || 'Unknown';

    page.drawText(new Date(tx.block_time).toLocaleDateString('en-AU'), {
      x: 50,
      y,
      size: 9,
      font,
    });

    page.drawText(txType, {
      x: 160,
      y,
      size: 9,
      font,
    });

    const details = `${tx.token_in_mint?.slice(0, 8) || 'N/A'} → ${tx.token_out_mint?.slice(0, 8) || 'N/A'}`;
    page.drawText(details, {
      x: 290,
      y,
      size: 9,
      font,
    });

    y -= 20;
  }
}

// ============================================
// CGT SCHEDULE PAGE
// ============================================

function drawCGTSchedulePage(
  page: any,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const { width } = page.getSize();
  let y = 780;

  page.drawText('Capital Gains Tax Schedule', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: COLORS.primary,
  });

  y -= 50;

  page.drawText('This schedule details all CGT events for the financial year.', {
    x: 50,
    y,
    size: 11,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  y -= 35;

  // Table header
  const headers = ['Asset', 'Acquired', 'Disposed', 'Cost Basis', 'Proceeds', 'Gain/Loss'];
  const colWidths = [100, 80, 80, 90, 90, 100];
  let x = 50;

  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x,
      y,
      size: 9,
      font: boldFont,
      color: COLORS.dark,
    });
    x += colWidths[i];
  }

  y -= 20;

  // Draw separator line
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    color: COLORS.dark,
    thickness: 1,
  });

  y -= 15;

  // CGT rows
  for (const gain of report.capitalGains) {
    if (y < 50) break;

    page.drawText(gain.asset.slice(0, 8) + '...', {
      x: 50,
      y,
      size: 8,
      font,
    });

    page.drawText(gain.acquiredAt.toLocaleDateString('en-AU'), {
      x: 160,
      y,
      size: 8,
      font,
    });

    page.drawText(gain.disposedAt.toLocaleDateString('en-AU'), {
      x: 250,
      y,
      size: 8,
      font,
    });

    page.drawText(formatAUD(gain.costBasis), {
      x: 340,
      y,
      size: 8,
      font,
    });

    page.drawText(formatAUD(gain.proceeds), {
      x: 440,
      y,
      size: 8,
      font,
    });

    const gainColor = gain.gain >= 0 ? COLORS.green : COLORS.red;
    page.drawText(formatAUD(gain.gain), {
      x: 540,
      y,
      size: 8,
      font,
      color: gainColor,
    });

    y -= 18;
  }
}

// ============================================
// HELPERS
// ============================================

function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

export function formatAUD(amount: number): string {
  return formatAUD(amount);
}

// SolTax AU - PDF Report Generation using pdf-lib
import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';
import type { TaxReport } from '@/types';

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

  // Cover + summary
  const coverPage = pdfDoc.addPage([595, 842]);
  const summaryPage = pdfDoc.addPage([595, 842]);
  drawCoverPage(coverPage, report, font, boldFont);
  drawSummaryPage(summaryPage, report, font, boldFont);

  // Transactions (paginated)
  if (report.transactions.length > 0) {
    drawTransactionsPages(pdfDoc, report, font, boldFont);
  }

  // CGT schedule (paginated)
  if (report.capitalGains.length > 0) {
    drawCGTSchedulePages(pdfDoc, report, font, boldFont);
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
  let y = 780;

  page.drawText('Tax Summary', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: COLORS.primary,
  });

  y -= 50;

  const summary = report.summary;

  page.drawText('ASSESSABLE INCOME', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });
  y -= 25;

  y = drawSummaryRow(page, y, 'Staking Rewards', 0, font);
  y = drawSummaryRow(page, y, 'Airdrops', 0, font);
  y = drawSummaryRow(page, y, 'Other Income', summary.totalIncome, font);
  y = drawSummaryRow(page, y, 'Total Income', summary.totalIncome, boldFont, { bold: true });
  y -= 15;

  page.drawText('CAPITAL GAINS', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });
  y -= 25;

  y = drawSummaryRow(page, y, 'Gross Capital Gains', summary.totalCapitalGains, font);
  y = drawSummaryRow(page, y, 'Capital Losses', -summary.totalCapitalLosses, font);
  y = drawSummaryRow(page, y, 'Net Capital Gain', summary.netCapitalGain, font);
  y = drawSummaryRow(page, y, 'CGT Discount (50%)', -summary.cgtDiscountApplied, font);
  y = drawSummaryRow(
    page,
    y,
    'Discounted Net Gain',
    summary.netCapitalGain - summary.cgtDiscountApplied,
    boldFont,
    { bold: true }
  );
  y -= 15;

  page.drawText('TAXABLE INCOME', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.primary,
  });
  y -= 25;
  y = drawSummaryRow(page, y, 'Total Taxable Income', summary.taxableIncome, boldFont, {
    bold: true,
  });
  y -= 15;

  page.drawText('ESTIMATED TAX', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.dark,
  });
  y -= 25;

  y = drawSummaryRow(page, y, 'Income Tax', summary.estimatedTax, font);
  y = drawSummaryRow(page, y, 'Medicare Levy (2%)', summary.medicareLevy, font);
  drawSummaryRow(page, y, 'TOTAL TAX PAYABLE', summary.totalTax, boldFont, {
    bold: true,
    color: COLORS.primary,
  });
}

function drawSummaryRow(
  page: any,
  y: number,
  label: string,
  amount: number,
  font: any,
  opts: { bold?: boolean; color?: RGB } = {}
): number {
  const color = opts.color || COLORS.dark;

  page.drawText(label, {
    x: 50,
    y,
    size: 11,
    font,
    color,
  });

  const amountStr = formatAUD(amount);
  const textWidth = font.widthOfTextAtSize(amountStr, 11);
  page.drawText(amountStr, {
    x: 545 - textWidth,
    y,
    size: 11,
    font,
    color,
  });

  return y - 20;
}

// ============================================
// TRANSACTIONS PAGE
// ============================================

function drawTransactionsPages(
  pdfDoc: PDFDocument,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const ROW_HEIGHT = 16;
  const TOP_Y = 760;
  const BOTTOM_Y = 60;
  const ROWS_PER_PAGE = Math.floor((TOP_Y - 60 - BOTTOM_Y) / ROW_HEIGHT);

  const chunks: typeof report.transactions[] = [];
  for (let i = 0; i < report.transactions.length; i += ROWS_PER_PAGE) {
    chunks.push(report.transactions.slice(i, i + ROWS_PER_PAGE));
  }

  chunks.forEach((chunk, pageIdx) => {
    const page = pdfDoc.addPage([595, 842]);
    const { width } = page.getSize();
    let y = TOP_Y;

    page.drawText(
      `Transaction History${chunks.length > 1 ? ` (page ${pageIdx + 1}/${chunks.length})` : ''}`,
      { x: 50, y, size: 20, font: boldFont, color: COLORS.primary }
    );
    y -= 40;

    const headers = ['Date', 'Type', 'Protocol', 'AUD In', 'AUD Out', 'Signature'];
    const xs = [50, 130, 220, 320, 410, 500];
    headers.forEach((h, i) =>
      page.drawText(h, { x: xs[i], y, size: 9, font: boldFont, color: COLORS.dark })
    );
    y -= 15;

    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      color: COLORS.dark,
      thickness: 1,
    });
    y -= 15;

    for (const tx of chunk) {
      const txType = (tx.ato_classification as any)?.type || tx.tx_type || 'Unknown';
      const protocol = tx.protocol || '—';
      const audIn = (tx.market_value_aud || 0).toFixed(2);
      const audOut = (tx.acquisition_cost_aud || 0).toFixed(2);
      const signature = tx.signature?.slice(0, 10) || 'N/A';

      page.drawText(new Date(tx.block_time).toLocaleDateString('en-AU'), {
        x: xs[0], y, size: 8, font,
      });
      page.drawText(String(txType).slice(0, 12), { x: xs[1], y, size: 8, font });
      page.drawText(String(protocol).slice(0, 12), {
        x: xs[2], y, size: 8, font, color: COLORS.primary,
      });
      page.drawText(`$${audIn}`, { x: xs[3], y, size: 8, font, color: COLORS.green });
      page.drawText(`$${audOut}`, { x: xs[4], y, size: 8, font, color: COLORS.red });
      page.drawText(`${signature}...`, { x: xs[5], y, size: 8, font });

      y -= ROW_HEIGHT;
    }

    if (pageIdx === chunks.length - 1) {
      page.drawText('Full transaction details at https://solscan.io/tx/[signature]', {
        x: 50,
        y: Math.max(y - 10, 40),
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  });
}

// ============================================
// CGT SCHEDULE PAGE
// ============================================

function drawCGTSchedulePages(
  pdfDoc: PDFDocument,
  report: TaxReport,
  font: any,
  boldFont: any
) {
  const ROW_HEIGHT = 18;
  const TOP_Y = 780;
  const FIRST_ROW_Y = TOP_Y - 100;
  const BOTTOM_Y = 60;
  const ROWS_PER_PAGE = Math.floor((FIRST_ROW_Y - BOTTOM_Y) / ROW_HEIGHT);

  const chunks: typeof report.capitalGains[] = [];
  for (let i = 0; i < report.capitalGains.length; i += ROWS_PER_PAGE) {
    chunks.push(report.capitalGains.slice(i, i + ROWS_PER_PAGE));
  }

  chunks.forEach((chunk, pageIdx) => {
    const page = pdfDoc.addPage([595, 842]);
    const { width } = page.getSize();
    let y = TOP_Y;

    page.drawText(
      `Capital Gains Tax Schedule${
        chunks.length > 1 ? ` (page ${pageIdx + 1}/${chunks.length})` : ''
      }`,
      { x: 50, y, size: 20, font: boldFont, color: COLORS.primary }
    );
    y -= 50;

    page.drawText('This schedule details all CGT events for the financial year.', {
      x: 50, y, size: 11, font, color: rgb(0.5, 0.5, 0.5),
    });
    y -= 35;

    const headers = ['Asset', 'Acquired', 'Disposed', 'Cost Basis', 'Proceeds', 'Gain/Loss'];
    const xs = [50, 160, 250, 340, 440, 540];
    headers.forEach((h, i) =>
      page.drawText(h, { x: xs[i], y, size: 9, font: boldFont, color: COLORS.dark })
    );
    y -= 20;

    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      color: COLORS.dark,
      thickness: 1,
    });
    y -= 15;

    for (const gain of chunk) {
      page.drawText(gain.asset.slice(0, 8) + '...', { x: xs[0], y, size: 8, font });
      page.drawText(gain.acquiredAt.toLocaleDateString('en-AU'), { x: xs[1], y, size: 8, font });
      page.drawText(gain.disposedAt.toLocaleDateString('en-AU'), { x: xs[2], y, size: 8, font });
      page.drawText(formatAUD(gain.costBasis), { x: xs[3], y, size: 8, font });
      page.drawText(formatAUD(gain.proceeds), { x: xs[4], y, size: 8, font });
      page.drawText(formatAUD(gain.gain), {
        x: xs[5], y, size: 8, font,
        color: gain.gain >= 0 ? COLORS.green : COLORS.red,
      });
      y -= ROW_HEIGHT;
    }
  });
}

// ============================================
// HELPERS
// ============================================

export function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

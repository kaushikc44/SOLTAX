// TaxMate - API: Generate Tax Report
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTaxReportPDF } from '@/lib/reports/pdf';
import { getTransactions, getCostBasisLots } from '@/lib/db/queries';
import { getFinancialYearRange } from '@/lib/ato/rules';
import { computeReport } from '@/lib/reports/calculate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportData, format = 'pdf' } = body;

    // Demo mode: accept reportData directly
    if (reportData) {
      if (format === 'pdf') {
        const pdfBytes = await generateTaxReportPDF({
          walletId: reportData.walletId,
          walletLabel: reportData.walletLabel || 'Connected Wallet',
          financialYear: reportData.financialYear || 2025,
          generatedAt: new Date(reportData.generatedAt || Date.now()),
          summary: reportData.summary || {
            totalIncome: 0,
            totalCapitalGains: 0,
            totalCapitalLosses: 0,
            netCapitalGain: 0,
            cgtDiscountApplied: 0,
            taxableIncome: 0,
            estimatedTax: 0,
            medicareLevy: 0,
            totalTax: 0,
          },
          transactions: reportData.transactions || [],
          capitalGains: reportData.capitalGains || [],
          incomeTransactions: reportData.incomeTransactions || [],
        });

        return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="soltax-report-${new Date().getFullYear()}.pdf"`,
          },
        });
      }
    }

    // Full mode with database (requires authentication)
    const { walletId, financialYear } = body;

    if (!walletId || !financialYear) {
      return NextResponse.json(
        { error: 'walletId and financialYear are required, or provide reportData for demo mode' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify wallet belongs to user
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, address, label')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single();

    const walletData: any = wallet;

    if (!walletData) {
      return NextResponse.json(
        { error: 'Wallet not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Get financial year date range
    const { start, end } = getFinancialYearRange(financialYear);

    // Fetch transactions for the financial year
    const txResult = await getTransactions(walletId, {
      startDate: new Date(start),
      endDate: new Date(end),
    });
    const transactions: any[] = txResult.data || [];

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found for this financial year' },
        { status: 404 }
      );
    }

    // Load cost basis lots and FIFO-match disposals against them.
    const lotsResult = await getCostBasisLots(walletId);
    const lots = (lotsResult.data || []) as any[];

    const report = computeReport(transactions as any[], lots as any[], {
      applyMedicareLevy: true,
      cgtDiscountEligible: true,
    });

    const incomeTransactions = (transactions as any[]).filter((_tx, i) => {
      const c = report.classifications[i];
      return c?.type === 'ORDINARY_INCOME';
    });

    if (format === 'pdf') {
      const pdfBytes = await generateTaxReportPDF({
        walletId,
        walletLabel: walletData?.label,
        financialYear,
        generatedAt: new Date(),
        summary: {
          financialYear,
          totalIncome: report.ordinaryIncome,
          totalCapitalGains: report.totalCapitalGains,
          totalCapitalLosses: report.totalCapitalLosses,
          netCapitalGain: report.netCapitalGain,
          cgtDiscountApplied: report.cgtDiscountApplied,
          taxableIncome: report.ordinaryIncome + report.netCapitalGain,
          estimatedTax: report.tax.incomeTax + report.tax.cgtTax,
          medicareLevy: report.tax.medicareLevy,
          totalTax: report.tax.totalTax,
        } as any,
        transactions,
        capitalGains: report.gains,
        incomeTransactions,
      });

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="taxmate-fy${financialYear}.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use "pdf" or "csv"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

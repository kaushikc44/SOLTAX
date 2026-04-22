// SolTax AU - API: Email a tax report as a PDF attachment
//
// Free users get in-browser PDF downloads only. Pro users can email the PDF
// to themselves (or their accountant). Resend is the transport.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { generateTaxReportPDF } from '@/lib/reports/pdf';
import { buildReportEmail } from '@/lib/reports/email-template';
import { getUserTier } from '@/lib/subscription';
import { getTransactions, getCostBasisLots, getWallet } from '@/lib/db/queries';
import { computeReport } from '@/lib/reports/calculate';
import { getFinancialYearRange } from '@/lib/ato/rules';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SolTax AU <reports@soltax.au>';

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email is not configured. Set RESEND_API_KEY.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tier = await getUserTier(user.id);
    if (tier !== 'pro') {
      return NextResponse.json(
        { error: 'Email reports are a Pro feature. Upgrade to unlock.', code: 'PRO_REQUIRED' },
        { status: 402 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reportData, to, walletId, financialYear } = body;
    const recipient = typeof to === 'string' && to.includes('@') ? to : user.email;

    if (!recipient) {
      return NextResponse.json(
        { error: 'No recipient email on file and none provided.' },
        { status: 400 }
      );
    }

    // Two modes:
    //  - { walletId, financialYear }  → load from DB, run FIFO, send the real thing
    //  - { reportData }               → accept client-computed payload (legacy)
    let pdfBytes: Uint8Array;
    let emailSummary: {
      financialYear: number;
      walletLabel: string;
      totalTransactions: number;
      totalIncome: number;
      totalCapitalGains: number;
      totalCapitalLosses: number;
      netCapitalGain: number;
      totalTax: number;
    };

    if (walletId && financialYear) {
      const walletRow = await getWallet(walletId);
      const walletData = walletRow.data as any;
      if (!walletData || walletData.user_id !== user.id) {
        return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });
      }

      const { start, end } = getFinancialYearRange(financialYear);
      const [txResult, lotsResult] = await Promise.all([
        getTransactions(walletId, { startDate: start, endDate: end, limit: 1000 }),
        getCostBasisLots(walletId),
      ]);
      const transactions = (txResult.data || []) as any[];
      const lots = (lotsResult.data || []) as any[];

      const report = computeReport(transactions, lots, {
        applyMedicareLevy: true,
        cgtDiscountEligible: true,
      });

      pdfBytes = await generateTaxReportPDF({
        walletId,
        walletLabel: walletData.label,
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
        incomeTransactions: transactions.filter((_t, i) => report.classifications[i]?.type === 'ORDINARY_INCOME'),
      });

      emailSummary = {
        financialYear,
        walletLabel: walletData.label || 'Connected Wallet',
        totalTransactions: transactions.length,
        totalIncome: report.ordinaryIncome,
        totalCapitalGains: report.totalCapitalGains,
        totalCapitalLosses: report.totalCapitalLosses,
        netCapitalGain: report.netCapitalGain,
        totalTax: report.tax.totalTax,
      };
    } else if (reportData) {
      pdfBytes = await generateTaxReportPDF({
        walletId: reportData.walletId,
        walletLabel: reportData.walletLabel || 'Connected Wallet',
        financialYear: reportData.financialYear || 2025,
        generatedAt: new Date(reportData.generatedAt || Date.now()),
        summary: reportData.summary,
        transactions: reportData.transactions || [],
        capitalGains: reportData.capitalGains || [],
        incomeTransactions: reportData.incomeTransactions || [],
      });
      const s = reportData.summary || {};
      emailSummary = {
        financialYear: reportData.financialYear || 2025,
        walletLabel: reportData.walletLabel || 'Connected Wallet',
        totalTransactions: (reportData.transactions || []).length,
        totalIncome: Number(s.totalIncome || 0),
        totalCapitalGains: Number(s.totalCapitalGains || 0),
        totalCapitalLosses: Number(s.totalCapitalLosses || 0),
        netCapitalGain: Number(s.netCapitalGain || 0),
        totalTax: Number(s.totalTax || 0),
      };
    } else {
      return NextResponse.json(
        { error: 'Provide either { walletId, financialYear } or { reportData }.' },
        { status: 400 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const filename = `taxmate-fy${emailSummary.financialYear}.pdf`;
    const { subject, html, text } = buildReportEmail(emailSummary);

    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: recipient,
      subject,
      html,
      text,
      attachments: [{ filename, content: Buffer.from(pdfBytes) as any }],
    });

    if (error) {
      console.error('Resend send error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, sentTo: recipient });
  } catch (error) {
    console.error('Email report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

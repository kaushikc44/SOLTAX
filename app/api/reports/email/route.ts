// SolTax AU - API: Email a tax report as a PDF attachment
//
// Free users get in-browser PDF downloads only. Pro users can email the PDF
// to themselves (or their accountant). Resend is the transport.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { generateTaxReportPDF } from '@/lib/reports/pdf';
import { getUserTier } from '@/lib/subscription';

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
    const { reportData, to } = body;
    const recipient = typeof to === 'string' && to.includes('@') ? to : user.email;

    if (!recipient) {
      return NextResponse.json(
        { error: 'No recipient email on file and none provided.' },
        { status: 400 }
      );
    }
    if (!reportData) {
      return NextResponse.json({ error: 'reportData is required' }, { status: 400 });
    }

    const pdfBytes = await generateTaxReportPDF({
      walletId: reportData.walletId,
      walletLabel: reportData.walletLabel || 'Connected Wallet',
      financialYear: reportData.financialYear || 2025,
      generatedAt: new Date(reportData.generatedAt || Date.now()),
      summary: reportData.summary,
      transactions: reportData.transactions || [],
      capitalGains: reportData.capitalGains || [],
      incomeTransactions: reportData.incomeTransactions || [],
    });

    const resend = new Resend(RESEND_API_KEY);
    const fy = reportData.financialYear || 2025;
    const filename = `soltax-fy${fy}.pdf`;

    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: recipient,
      subject: `Your SolTax AU report — FY ${fy}`,
      html: `
        <p>Your SolTax AU tax report for financial year ${fy} is attached.</p>
        <p>This report is informational only. Always review with a registered tax agent
        before lodging your return.</p>
        <p>— SolTax AU</p>
      `,
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

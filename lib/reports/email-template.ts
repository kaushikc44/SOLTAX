// TaxMate - Branded HTML email for report delivery.

interface EmailSummary {
  financialYear: number;
  walletLabel: string;
  totalTransactions: number;
  totalIncome: number;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  netCapitalGain: number;
  totalTax: number;
}

function formatAUD(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function buildReportEmail(summary: EmailSummary): { subject: string; html: string; text: string } {
  const fy = summary.financialYear;
  const subject = `Your TaxMate report — FY ${fy}–${(fy + 1).toString().slice(-2)}`;

  const row = (label: string, value: string, highlight = false) => `
    <tr>
      <td style="padding:10px 0;color:#4b5563;font-size:14px;">${label}</td>
      <td style="padding:10px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:${highlight ? 600 : 500};color:${highlight ? '#0a0f14' : '#111827'};font-size:14px;">${value}</td>
    </tr>
  `;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;max-width:560px;">
            <tr>
              <td style="background:#0a0f14;padding:24px 28px;color:#ffffff;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <!-- diamonds -->
                  <svg width="40" height="28" viewBox="90 60 130 90" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="100,105 138,67 176,105 138,143" fill="#14F195"/>
                    <polygon points="138,105 176,67 214,105 176,143" fill="#9945FF" opacity="0.85"/>
                  </svg>
                  <span style="font-size:20px;font-weight:600;">Tax<span style="color:#14F195;">Mate</span></span>
                </div>
                <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">ATO crypto tax · Solana</p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 8px;font-size:22px;color:#0a0f14;">Your tax report is ready</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.5;">
                  Here's a quick summary of your ${summary.walletLabel} activity for the ${fy}–${(fy + 1).toString().slice(-2)}
                  Australian financial year. The full PDF is attached.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
                  ${row('Transactions', String(summary.totalTransactions))}
                  ${row('Assessable income', formatAUD(summary.totalIncome))}
                  ${row('Capital gains', formatAUD(summary.totalCapitalGains))}
                  ${row('Capital losses', formatAUD(summary.totalCapitalLosses))}
                  ${row('Net capital gain', formatAUD(summary.netCapitalGain))}
                  ${row('Estimated total tax', formatAUD(summary.totalTax), true)}
                </table>

                <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                  This report is informational only. Always review with a registered tax agent before lodging.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
                TaxMate · Australian Solana Tax Engine
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `TaxMate — FY ${fy}–${(fy + 1).toString().slice(-2)}`,
    '',
    `Wallet: ${summary.walletLabel}`,
    `Transactions: ${summary.totalTransactions}`,
    `Assessable income: ${formatAUD(summary.totalIncome)}`,
    `Capital gains: ${formatAUD(summary.totalCapitalGains)}`,
    `Capital losses: ${formatAUD(summary.totalCapitalLosses)}`,
    `Net capital gain: ${formatAUD(summary.netCapitalGain)}`,
    `Estimated total tax: ${formatAUD(summary.totalTax)}`,
    '',
    'Full PDF attached. Always review with a registered tax agent before lodging.',
  ].join('\n');

  return { subject, html, text };
}

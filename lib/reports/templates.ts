// SolTax AU - Report Templates
// Templates for tax reports and schedules

import type { TaxReport, FinancialYear } from '@/types';

// ============================================
// REPORT TEMPLATES
// ============================================

export const REPORT_TEMPLATES = {
  // ATO Individual Tax Return relevant sections
  atoIndividual: {
    // Supplementary section for crypto
    supplementarySection: `
# Cryptocurrency Activities

This report details cryptocurrency transactions for the financial year.

## Summary
- Total disposals: {{disposalCount}}
- Total capital gains: {{totalGains}}
- Total capital losses: {{totalLosses}}
- Net capital gain: {{netGain}}
- CGT discount applied: {{discount}}

## Income from Crypto
- Staking rewards: {{stakingRewards}}
- Airdrops: {{airdrops}}
- Other crypto income: {{otherIncome}}
`,

    // Capital gains tax schedule
    cgtSchedule: `
# Capital Gains Tax Schedule

| Asset | Acquired | Disposed | Cost Basis | Proceeds | Gain/Loss |
|-------|----------|----------|------------|----------|-----------|
{{#gains}}
| {{asset}} | {{acquired}} | {{disposed}} | {{costBasis}} | {{proceeds}} | {{gain}} |
{{/gains}}
`,
  },

  // Record keeping template
  recordKeeping: `
# Cryptocurrency Transaction Records
## Financial Year {{financialYear}}

### Wallet Addresses
{{#wallets}}
- {{label}}: {{address}}
{{/wallets}}

### Transaction Summary
- Total transactions: {{totalTransactions}}
- Taxable events: {{taxableEvents}}
- Non-taxable transfers: {{nonTaxableTransfers}}

### Important Notes
1. Keep records for 5 years from lodgment date
2. Cost basis records essential for future CGT calculations
3. This report should be kept with your tax records
`,
} as const;

// ============================================
// FINANCIAL YEAR HELPERS
// ============================================

export function getFinancialYearLabel(year: FinancialYear): string {
  // FY2024 = July 1, 2023 to June 30, 2024
  const startYear = year - 1;
  return `FY${year} (${startYear}-${year.toString().slice(-2)})`;
}

export function getFinancialYearRange(year: FinancialYear): { start: string; end: string } {
  const start = `${year - 1}-07-01`;
  const end = `${year}-06-30`;
  return { start, end };
}

export function getCurrentFinancialYear(): FinancialYear {
  const now = new Date();
  const year = now.getFullYear();
  // If we're in July or later, FY ends next year
  if (now.getMonth() >= 6) {
    return year + 1;
  }
  return year;
}

export function getAvailableFinancialYears(): FinancialYear[] {
  // Return last 5 financial years plus current
  const current = getCurrentFinancialYear();
  const years: FinancialYear[] = [];

  for (let i = 4; i >= 0; i--) {
    years.push((current - i) as FinancialYear);
  }

  return years;
}

// ============================================
// ATO GUIDANCE TEXT
// ============================================

export const ATO_GUIDANCE = {
  // Disclaimer for reports
  disclaimer: `
**Disclaimer**: This report is generated for informational purposes only and does not
constitute tax advice. The information contained herein is based on ATO guidance
available at the time of generation. Tax laws and interpretations may change.

You should consult with a qualified tax professional before lodging your tax return.
SolTax AU accepts no liability for errors or omissions in this report or any tax
consequences arising from its use.
`,

  // Record keeping requirements
  recordKeepingRequirements: `
**ATO Record Keeping Requirements**

The ATO requires you to keep records of your cryptocurrency transactions for
five years from the date you lodge your tax return. Records must include:

1. Date of each transaction
2. Value in Australian dollars at time of transaction
3. Purpose of transaction
4. Details of other party (even if just wallet address)
5. Exchange records or calculations
6. Digital wallet records and keys

Electronic records are acceptable if they are true copies of original records.
`,

  // CGT discount explanation
  cgtDiscountExplanation: `
**CGT Discount (50%)**

Individuals and trusts may be eligible for a 50% discount on capital gains
if the asset was held for at least 12 months before disposal.

The discount is applied AFTER offsetting any capital losses.

Super funds receive a 33⅓% discount instead of 50%.

Companies and trusts where beneficiaries are companies are not eligible.
`,
} as const;

// ============================================
// EMAIL TEMPLATE
// ============================================

export const EMAIL_TEMPLATES = {
  // Report ready email
  reportReady: {
    subject: 'Your SolTax AU Tax Report is Ready',
    body: `
Hi {{name}},

Your cryptocurrency tax report for Financial Year {{financialYear}} is ready.

Report Summary:
- Wallet: {{walletLabel}}
- Transactions: {{transactionCount}}
- Estimated Tax: {{estimatedTax}}

You can download your report from the dashboard:
{{dashboardUrl}}

If you have any questions, please don't hesitate to contact us.

Best regards,
The SolTax AU Team
`,
  },

  // Reminder to complete tax filing
  filingReminder: {
    subject: 'Tax Filing Deadline Reminder',
    body: `
Hi {{name}},

A friendly reminder that the tax filing deadline is approaching.

Key Dates:
- Self-lodgment: October 31
- Through tax agent: May 15 (following year)

Your SolTax AU report can be provided to your tax accountant to assist
with your tax return preparation.

Best regards,
The SolTax AU Team
`,
  },
} as const;

// ============================================
// PRINT STYLES
// ============================================

export const PRINT_STYLES = `
@media print {
  body {
    font-size: 12pt;
    line-height: 1.5;
  }

  .no-print {
    display: none !important;
  }

  a[href] {
    text-decoration: underline;
  }

  a[href]:after {
    content: " (" attr(href) ")";
  }

  table {
    page-break-inside: avoid;
  }

  h1, h2, h3 {
    page-break-after: avoid;
  }

  @page {
    margin: 2cm;
  }
}
`.trim();

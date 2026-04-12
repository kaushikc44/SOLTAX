// SolTax AU - ATO Tax Constants
// Australian Tax Office tax rates and thresholds for 2024-25

// ============================================
// INCOME TAX BRACKETS (2024-25, Stage 3 tax cuts)
// ============================================

export const TAX_BRACKETS = [
  { min: 0, max: 18200, rate: 0, baseTax: 0 },
  { min: 18201, max: 45000, rate: 19, baseTax: 0 },
  { min: 45001, max: 135000, rate: 30, baseTax: 5092 },
  { min: 135001, max: 190000, rate: 37, baseTax: 32092 },
  { min: 190001, max: null, rate: 45, baseTax: 52442 },
] as const;

// ============================================
// MEDICARE LEVY
// ============================================

export const MEDICARE_LEVY_RATE = 0.02; // 2%

// Medicare levy thresholds (2024-25)
export const MEDICARE_LEVY_THRESHOLDS = {
  single: 26000,
  family: 43822,
  perChild: 4321,
};

// Medicare levy phase-in rate
export const MEDICARE_PHASE_IN_RATE = 0.08;

// ============================================
// CAPITAL GAINS TAX (CGT)
// ============================================

// CGT discount for individuals (50% for assets held 12+ months)
export const CGT_DISCOUNT_RATE = 0.5;

// Minimum holding period for CGT discount (in days)
export const CGT_DISCOUNT_HOLDING_PERIOD_DAYS = 365;

// ============================================
// PERSONAL USE ASSETS
// ============================================

// Personal use asset threshold
// Crypto used for personal purchases under this amount may be exempt
export const PERSONAL_USE_ASSET_THRESHOLD = 10000; // $10,000 AUD

// ============================================
// TAX-FREE THRESHOLD
// ============================================

export const TAX_FREE_THRESHOLD = 18200; // $18,200 AUD

// ============================================
// LOW INCOME TAX OFFSET (LITO)
// ============================================

export const LITO = {
  maxOffset: 700,
  phaseOutStart: 37500,
  phaseOutEnd: 66667,
  phaseOutRate: 0.05,
};

// ============================================
// TAX OFFSETS
// ============================================

// Senior Australians and Pensioners Tax Offset (SAPTO)
export const SAPTO = {
  single: {
    threshold: 32279,
    maxOffset: 2230,
    phaseOutRate: 0.125,
    cutOut: 50119,
  },
  couple: {
    threshold: 28974,
    maxOffset: 1784,
    phaseOutRate: 0.125,
    cutOut: 42434,
  },
};

// ============================================
// HELP/HECS/SSL THRESHOLDS (2024-25)
// ============================================

export const HELP_REPAYMENT_THRESHOLDS = [
  { threshold: 51550, rate: 0.01 },
  { threshold: 59231, rate: 0.02 },
  { threshold: 67273, rate: 0.025 },
  { threshold: 70909, rate: 0.03 },
  { threshold: 76811, rate: 0.035 },
  { threshold: 84139, rate: 0.04 },
  { threshold: 91982, rate: 0.045 },
  { threshold: 100392, rate: 0.05 },
  { threshold: 109302, rate: 0.055 },
  { threshold: 118725, rate: 0.06 },
  { threshold: 128889, rate: 0.065 },
  { threshold: 140009, rate: 0.07 },
  { threshold: 152573, rate: 0.075 },
  { threshold: 166273, rate: 0.08 },
  { threshold: 181210, rate: 0.085 },
  { threshold: 197488, rate: 0.09 },
  { threshold: 215275, rate: 0.095 },
  { threshold: 215276, rate: 0.10 },
];

// ============================================
// SUPERANNUATION
// ============================================

// Concessional contributions cap (2024-25)
export const CONCESSIONAL_CONTRIBUTIONS_CAP = 30000;

// Non-concessional contributions cap (2024-25)
export const NON_CONCESSIONAL_CONTRIBUTIONS_CAP = 120000;

// Bring-forward rule trigger (total balance threshold)
export const BRING_FORWARD_THRESHOLD = 1900000;

// ============================================
// CRYPTO-SPECIFIC GUIDANCE (ATO)
// ============================================

// ATO classification guidance for crypto transactions
export const CRYPTO_CLASSIFICATIONS = {
  // Income events (assessable income)
  income: [
    'staking_rewards',
    'airdrops',
    'mining_rewards',
    'interest_earnings',
    'salary_wages',
  ],
  // CGT events (capital gains/losses)
  cgt: [
    'selling_crypto_for_fiat',
    'crypto_to_crypto_swap',
    'spending_crypto',
    'gifting_crypto',
  ],
  // Non-taxable events
  non_taxable: [
    'buying_crypto_with_fiat',
    'transferring_between_own_wallets',
    'holding',
  ],
};

// ============================================
// FINANCIAL YEAR DATES
// ============================================

export function getFinancialYearRange(year: number): { start: Date; end: Date } {
  // Australian financial year: July 1 to June 30
  // Year refers to the ending year (e.g., FY2024 = Jul 2023 - Jun 2024)
  const start = new Date(year - 1, 6, 1); // July 1 of previous year
  const end = new Date(year, 5, 30, 23, 59, 59); // June 30 of specified year
  return { start, end };
}

export function getFinancialYear(date: Date): number {
  // If date is in July or later, FY ends next calendar year
  if (date.getMonth() >= 6) { // June is month 5, July is month 6
    return date.getFullYear() + 1;
  }
  return date.getFullYear();
}

// ============================================
// INTEREST RATES (for CGT calculations)
// ============================================

// ATO interest rates for late payments
export const GENERAL_INTEREST_CHARGE_RATE = 0.1089; // 10.89% per annum
export const SHORTFALL_INTEREST_CHARGE_RATE = 0.0789; // 7.89% per annum

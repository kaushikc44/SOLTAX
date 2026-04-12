// SolTax AU - Utility Formatters

/**
 * Format number as Australian Dollars.
 */
export function formatAUD(amount: number, options?: { decimals?: number }): string {
  const { decimals = 2 } = options || {};
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format token amount with decimals.
 */
export function formatTokenAmount(amount: number | string, decimals: number = 9): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';

  // Adjust decimal places based on amount size
  let displayDecimals = decimals;
  if (num >= 1000) {
    displayDecimals = 2;
  } else if (num >= 1) {
    displayDecimals = 4;
  } else if (num >= 0.001) {
    displayDecimals = 6;
  }

  return num.toLocaleString('en-AU', {
    minimumFractionDigits: Math.min(displayDecimals, 6),
    maximumFractionDigits: Math.min(displayDecimals, 9),
  });
}

/**
 * Format SOL amount (lamports to SOL).
 */
export function formatSOL(lamports: number | bigint): string {
  const sol = typeof lamports === 'bigint'
    ? Number(lamports) / 1_000_000_000
    : lamports / 1_000_000_000;

  return formatTokenAmount(sol, 9);
}

/**
 * Format wallet address for display (truncate).
 */
export function formatAddress(address: string, length: number = 4): string {
  if (!address || address.length < length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Format signature for display.
 */
export function formatSignature(signature: string): string {
  return formatAddress(signature, 6);
}

/**
 * Format date for display.
 */
export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return d.toLocaleDateString('en-AU', options || defaultOptions);
}

/**
 * Format date with time.
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
}

/**
 * Format percentage.
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with commas.
 */
export function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse AUD string back to number.
 */
export function parseAUD(str: string): number {
  // Remove $, commas, and spaces
  const cleaned = str.replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Format financial year.
 */
export function formatFinancialYear(year: number): string {
  return `FY${year} (${year - 1}-${year.toString().slice(-2)})`;
}

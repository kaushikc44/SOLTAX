// SolTax AU - Components Export

// UI Components
export * from './ui';

// Dashboard Components
export { WalletCard } from './dashboard/WalletCard';
export { TransactionTable as DashboardTransactionTable } from './dashboard/TransactionTable';
export { TaxSummaryCard, IncomeCard, CapitalGainsCard, TaxPayableCard } from './dashboard/TaxSummaryCard';
export { RecentActivity } from './dashboard/RecentActivity';

// Wallet Components
export { WalletForm } from './wallets/WalletForm';
export { WalletList } from './wallets/WalletList';

// Report Components
export { ReportGenerator } from './reports/ReportGenerator';
export { YearSelector } from './reports/YearSelector';

// Layout Components
export { Header, Sidebar, Footer } from './layout';

// New Dashboard Components
export { WalletConnect } from './WalletConnect';
export { TaxSummaryCard as NewTaxSummaryCard } from './TaxSummaryCard';
export { TransactionTable } from './TransactionTable';
export { ReviewModal } from './ReviewModal';
export { HarvestingOpportunities } from './HarvestingOpportunities';

// SolTax AU - Year Selector Component
import {
  getAvailableFinancialYears,
  getFinancialYearLabel,
} from '@/lib/reports/templates';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: number;
  onChange: (year: number) => void;
  className?: string;
}

export function YearSelector({ selectedYear, onChange, className }: YearSelectorProps) {
  const years = getAvailableFinancialYears();
  const currentIndex = years.indexOf(selectedYear);

  const goToPrevious = () => {
    if (currentIndex < years.length - 1) {
      onChange(years[currentIndex + 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0) {
      onChange(years[currentIndex - 1]);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <button
        onClick={goToPrevious}
        disabled={currentIndex >= years.length - 1}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <select
        value={selectedYear}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-aus-green-500"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {getFinancialYearLabel(year)}
          </option>
        ))}
      </select>

      <button
        onClick={goToNext}
        disabled={currentIndex <= 0}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

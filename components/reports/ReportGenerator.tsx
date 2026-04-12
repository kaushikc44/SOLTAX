// SolTax AU - Report Generator Component
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  getAvailableFinancialYears,
  getFinancialYearLabel,
} from '@/lib/reports/templates';
import { Download, FileText, Loader2 } from 'lucide-react';

interface ReportGeneratorProps {
  walletId: string;
  onGenerate: (options: {
    walletId: string;
    financialYear: number;
    format: 'pdf' | 'csv';
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ReportGenerator({ walletId, onGenerate, isLoading }: ReportGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    getAvailableFinancialYears()[0]
  );
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  const availableYears = getAvailableFinancialYears();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        walletId,
        financialYear: selectedYear,
        format,
      });
      setIsModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Tax Report
          </CardTitle>
          <CardDescription>
            Create an ATO-compliant tax report for your crypto transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Select financial year and format
              </span>
              <Button onClick={() => setIsModalOpen(true)}>
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Tax Report"
        description="Choose the financial year and format for your report"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} isLoading={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Financial Year Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Financial Year</label>
            <div className="grid grid-cols-2 gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedYear === year
                      ? 'border-aus-green-500 bg-aus-green-50 dark:bg-aus-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{getFinancialYearLabel(year)}</div>
                  <div className="text-xs text-gray-500">
                    {year - 1}-07-01 to {year}-06-30
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === 'pdf'
                    ? 'border-aus-green-500 bg-aus-green-50 dark:bg-aus-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">PDF</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ATO-compliant report format
                </div>
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === 'csv'
                    ? 'border-aus-green-500 bg-aus-green-50 dark:bg-aus-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  <span className="font-medium">CSV</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Spreadsheet format
                </div>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your report will include all transactions for the selected financial year,
              capital gains calculations, and income summaries ready for your tax return.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

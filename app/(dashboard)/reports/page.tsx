// SolTax AU - Reports Page
import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { YearSelector } from '@/components/reports/YearSelector';
import { getWallets, getTaxSummaries } from '@/lib/db/queries';
import {
  getAvailableFinancialYears,
  getFinancialYearLabel
} from '@/lib/reports/templates';
import { FileText, Download, ChevronRight } from 'lucide-react';

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/reports');
  }

  const walletsResult = await getWallets(user.id);
  const wallets: any[] = walletsResult.data || [];
  const firstWalletId = wallets.length > 0 ? wallets[0].id : '';

  const taxSummariesResult = await getTaxSummaries(firstWalletId);
  const taxSummaries: any[] = taxSummariesResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax Reports</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate ATO-compliant tax reports for your crypto transactions
        </p>
      </div>

      {/* Report Generator */}
      {wallets.length > 0 && (
        <ReportGenerator
          walletId={wallets[0].id}
          onGenerate={async (options) => {
            'use server';
            // Would trigger report generation API
            console.log('Generating report:', options);
          }}
        />
      )}

      {/* Past Reports */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Generated Reports</h2>

        {taxSummaries.length > 0 ? (
          <div className="grid gap-4">
            {taxSummaries.map((summary) => (
              <Card key={summary.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{getFinancialYearLabel(summary.financial_year)}</CardTitle>
                    <CardDescription>
                      Generated on {new Date(summary.created_at).toLocaleDateString('en-AU')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Income</p>
                      <p className="font-medium">
                        ${parseFloat(summary.total_income_aud).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capital Gains</p>
                      <p className="font-medium">
                        ${parseFloat(summary.total_cgt_gains).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capital Losses</p>
                      <p className="font-medium">
                        ${parseFloat(summary.total_cgt_losses).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Net Gain</p>
                      <p className="font-medium">
                        ${parseFloat(summary.net_capital_gain).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No reports generated yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate your first tax report to see it here
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ATO Guidance */}
      <Card>
        <CardHeader>
          <CardTitle>ATO Record Keeping Requirements</CardTitle>
          <CardDescription>
            What you need to keep for your tax return
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-aus-green-600" />
              <span>Date of each transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-aus-green-600" />
              <span>Value in Australian dollars at time of transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-aus-green-600" />
              <span>Purpose of the transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 mt-0.5 text-aus-green-600" />
              <span>Details of the other party (wallet address is sufficient)</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            Source: ATO guidance on cryptocurrency and tax
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

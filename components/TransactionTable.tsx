// SolTax AU - Transaction Table Component
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react';

interface Transaction {
  id: string;
  signature: string;
  block_time: string;
  type: string;
  protocol?: string;
  description: string;
  audIn?: number;
  audOut?: number;
  classification: string;
  aiConfidence?: number;
  isSpam?: boolean;
  needsReview?: boolean;
  aiExplanation?: string;
  ato_rule?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onReview?: (transaction: Transaction) => void;
  isLoading?: boolean;
}

type FilterType = 'all' | 'cgt' | 'income' | 'review' | 'spam';

export function TransactionTable({
  transactions,
  onReview,
  isLoading = false,
}: TransactionTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    switch (currentFilter) {
      case 'cgt':
        return tx.classification.toUpperCase().includes('SWAP') ||
          tx.classification.toUpperCase().includes('NFT') ||
          tx.classification.toUpperCase().includes('LP');
      case 'income':
        return tx.classification.toUpperCase().includes('INCOME') ||
          tx.classification.toUpperCase().includes('REWARD') ||
          tx.classification.toUpperCase().includes('AIRDROP');
      case 'review':
        return tx.needsReview || (tx.aiConfidence && tx.aiConfidence < 0.7);
      case 'spam':
        return tx.isSpam || tx.classification.toUpperCase() === 'SPAM';
      default:
        return true;
    }
  });

  // Paginate
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatAUD = (amount?: number) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRowColor = (tx: Transaction) => {
    if (tx.isSpam || tx.classification.toUpperCase() === 'SPAM') {
      return 'bg-gray-100 dark:bg-gray-800';
    }
    if (tx.needsReview || (tx.aiConfidence && tx.aiConfidence < 0.7)) {
      return 'bg-yellow-50 dark:bg-yellow-900/10';
    }
    const type = tx.classification.toUpperCase();
    if (type.includes('INCOME') || type.includes('REWARD') || type.includes('AIRDROP')) {
      return 'bg-amber-50 dark:bg-amber-900/10';
    }
    if (type.includes('SWAP') || type.includes('NFT') || type.includes('LP') || type.includes('DISPOSAL')) {
      return 'bg-red-50 dark:bg-red-900/10';
    }
    if (type.includes('TRANSFER') || type.includes('NON_TAXABLE')) {
      return 'bg-green-50 dark:bg-green-900/10';
    }
    return '';
  };

  const getClassificationBadge = (tx: Transaction) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';

    if (tx.needsReview || (tx.aiConfidence && tx.aiConfidence < 0.7)) {
      return (
        <span className={`${baseClasses} bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>
          Needs Review
        </span>
      );
    }

    const type = tx.classification.toUpperCase();
    if (type.includes('SPAM')) {
      return (
        <span className={`${baseClasses} bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>
          Spam
        </span>
      );
    }
    if (type.includes('INCOME') || type.includes('REWARD') || type.includes('AIRDROP')) {
      return (
        <span className={`${baseClasses} bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300`}>
          Income
        </span>
      );
    }
    if (type.includes('SWAP') || type.includes('NFT') || type.includes('LP')) {
      return (
        <span className={`${baseClasses} bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300`}>
          CGT Event
        </span>
      );
    }
    if (type.includes('TRANSFER') || type.includes('NON_TAXABLE')) {
      return (
        <span className={`${baseClasses} bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300`}>
          Non-Taxable
        </span>
      );
    }

    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}>
        {tx.classification}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions found
            </CardDescription>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={currentFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setCurrentFilter('all'); setCurrentPage(1); }}
            >
              All
            </Button>
            <Button
              variant={currentFilter === 'cgt' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setCurrentFilter('cgt'); setCurrentPage(1); }}
            >
              CGT Events
            </Button>
            <Button
              variant={currentFilter === 'income' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setCurrentFilter('income'); setCurrentPage(1); }}
            >
              Income
            </Button>
            <Button
              variant={currentFilter === 'review' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setCurrentFilter('review'); setCurrentPage(1); }}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Review
            </Button>
            <Button
              variant={currentFilter === 'spam' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => { setCurrentFilter('spam'); setCurrentPage(1); }}
            >
              Spam
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[100px]">Protocol</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">AUD In</TableHead>
                <TableHead className="text-right">AUD Out</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <>
                  <TableRow
                    key={tx.id}
                    className={`cursor-pointer ${getRowColor(tx)}`}
                    onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {formatDate(tx.block_time)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium uppercase">{tx.type}</span>
                    </TableCell>
                    <TableCell>
                      {tx.protocol ? (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {tx.protocol}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatAUD(tx.audIn)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatAUD(tx.audOut)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getClassificationBadge(tx)}
                        {tx.aiConfidence && tx.aiConfidence < 0.7 && (
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tx.needsReview && onReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReview(tx);
                            }}
                          >
                            Review
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          {expandedRow === tx.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row */}
                  {expandedRow === tx.id && (
                    <TableRow>
                      <TableCell className="bg-gray-50 dark:bg-gray-900 p-4" colSpan={7}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Transaction Details</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Signature:</span>
                              <span className="ml-2 font-mono">{tx.signature.slice(0, 20)}...{tx.signature.slice(-20)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Classification:</span>
                              <span className="ml-2">{tx.classification}</span>
                            </div>
                          </div>
                          {tx.aiExplanation && (
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                              <p className="text-sm font-medium mb-1">AI Explanation:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{tx.aiExplanation}</p>
                            </div>
                          )}
                          {tx.ato_rule && (
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
                              <p className="text-sm font-medium mb-1">ATO Rule:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{tx.ato_rule}</p>
                            </div>
                          )}
                          {tx.aiConfidence && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">AI Confidence:</span>
                              <span className={`font-medium ${
                                tx.aiConfidence >= 0.8 ? 'text-green-600' :
                                tx.aiConfidence >= 0.5 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {(tx.aiConfidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No transactions found for this filter.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

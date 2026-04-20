// SolTax AU - Transaction Table Component
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Transaction } from '@/types';
import { formatDate, formatAUD, formatAddress } from '@/lib/utils/formatters';
import { ArrowUpRight, ArrowDownLeft, Repeat, DollarSign } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onRowClick?: (tx: Transaction) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  swap: <Repeat className="h-4 w-4" />,
  transfer: <ArrowUpRight className="h-4 w-4" />,
  stake: <ArrowUpRight className="h-4 w-4" />,
  unstake: <ArrowDownLeft className="h-4 w-4" />,
  claim_rewards: <DollarSign className="h-4 w-4" />,
  nft_purchase: <ArrowDownLeft className="h-4 w-4" />,
  nft_sale: <ArrowUpRight className="h-4 w-4" />,
  airdrop: <DollarSign className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  swap: 'Swap',
  transfer: 'Transfer',
  stake: 'Stake',
  unstake: 'Unstake',
  claim_rewards: 'Rewards',
  nft_purchase: 'NFT Purchase',
  nft_sale: 'NFT Sale',
  airdrop: 'Airdrop',
  unknown: 'Unknown',
};

export function TransactionTable({ transactions, onRowClick }: TransactionTableProps) {
  const [sortField, setSortField] = useState<'date' | 'type' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'type' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'date':
        comparison = new Date(a.block_time).getTime() - new Date(b.block_time).getTime();
        break;
      case 'type':
        comparison = a.tx_type.localeCompare(b.tx_type);
        break;
      case 'amount':
        const aAmount = parseFloat(a.token_in_amount || '0');
        const bAmount = parseFloat(b.token_in_amount || '0');
        comparison = aAmount - bAmount;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => handleSort('date')}
            >
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-right"
              onClick={() => handleSort('amount')}
            >
              Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-right">Classification</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((tx) => {
            const classification = tx.ato_classification as any;
            const txType = tx.tx_type;

            return (
              <TableRow
                key={tx.id}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                onClick={() => onRowClick?.(tx)}
              >
                <TableCell className="font-medium">
                  {formatDate(tx.block_time)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {TYPE_ICONS[txType] || TYPE_ICONS.unknown}
                    <span>{TYPE_LABELS[txType] || txType}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <div className="truncate text-sm text-gray-500">
                    {tx.token_in_mint
                      ? `${formatAddress(tx.token_in_mint, 4)} → ${tx.token_out_mint ? formatAddress(tx.token_out_mint, 4) : 'N/A'}`
                      : formatAddress(tx.signature, 4)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {tx.token_in_amount ? (
                    <div className="text-sm font-medium">
                      {parseFloat(tx.token_in_amount).toFixed(4)}
                    </div>
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {classification ? (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        classification.type === 'income' || classification.type === 'disposal'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : classification.type === 'spam'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {classification.type}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Not classified</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          <p className="text-sm text-gray-400 mt-1">
            Connect a wallet to start tracking transactions
          </p>
        </div>
      )}
    </div>
  );
}

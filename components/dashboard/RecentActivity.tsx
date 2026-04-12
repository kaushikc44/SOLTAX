// SolTax AU - Recent Activity Component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transaction } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils/formatters';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  DollarSign,
  Gift,
  AlertCircle,
} from 'lucide-react';

interface RecentActivityProps {
  transactions: Transaction[];
  limit?: number;
  onViewAll?: () => void;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  swap: <Repeat className="h-4 w-4" />,
  transfer: <ArrowUpRight className="h-4 w-4" />,
  stake: <ArrowUpRight className="h-4 w-4" />,
  unstake: <ArrowDownLeft className="h-4 w-4" />,
  claim_rewards: <DollarSign className="h-4 w-4" />,
  nft_purchase: <ArrowDownLeft className="h-4 w-4" />,
  nft_sale: <ArrowUpRight className="h-4 w-4" />,
  airdrop: <Gift className="h-4 w-4" />,
  spam: <AlertCircle className="h-4 w-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  swap: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  transfer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  stake: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  unstake: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  claim_rewards: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  nft_purchase: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  nft_sale: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300',
  airdrop: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  spam: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
};

export function RecentActivity({ transactions, limit = 5, onViewAll }: RecentActivityProps) {
  const recentTransactions = transactions.slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        {onViewAll && transactions.length > limit && (
          <button
            onClick={onViewAll}
            className="text-sm text-aus-green-600 hover:text-aus-green-700 font-medium"
          >
            View all →
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((tx) => {
            const classification = tx.ato_classification as any;
            const type = classification?.type || tx.tx_type;
            const icon = ACTIVITY_ICONS[type] || ACTIVITY_ICONS.transfer;
            const colorClass = ACTIVITY_COLORS[type] || ACTIVITY_COLORS.transfer;

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className={`p-2 rounded-full ${colorClass}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {classification?.explanation || tx.tx_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(tx.block_time)}
                  </p>
                </div>
                <div className="text-right">
                  {tx.token_in_amount && (
                    <p className="text-sm font-medium">
                      {parseFloat(tx.token_in_amount).toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatDate(tx.block_time, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

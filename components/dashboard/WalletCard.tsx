// SolTax AU - Wallet Card Component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Wallet } from '@/types';
import { formatAddress } from '@/lib/utils/formatters';
import { Wallet as WalletIcon, ArrowRight, Trash2 } from 'lucide-react';

interface WalletCardProps {
  wallet: Wallet & {
    balanceSol?: number;
    transactionCount?: number;
  };
  onView?: () => void;
  onDelete?: () => void;
}

export function WalletCard({ wallet, onView, onDelete }: WalletCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" />
            {wallet.label || 'Wallet'}
          </div>
        </CardTitle>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete wallet"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {formatAddress(wallet.address, 6)}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Balance</span>
            <span className="font-medium">
              {wallet.balanceSol !== undefined ? `${wallet.balanceSol.toFixed(4)} SOL` : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Transactions</span>
            <span className="font-medium">
              {wallet.transactionCount !== undefined ? wallet.transactionCount : '--'}
            </span>
          </div>

          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

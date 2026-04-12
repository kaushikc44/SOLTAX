// SolTax AU - Review Modal Component
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
  X,
  FileText,
  CheckCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface Transaction {
  id: string;
  signature: string;
  block_time: string;
  type: string;
  description: string;
  audIn?: number;
  audOut?: number;
  classification: string;
  aiConfidence?: number;
  aiExplanation?: string;
  ato_rule?: string;
  raw?: unknown;
}

interface ReviewModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionId: string, newClassification: string) => void;
}

const CLASSIFICATION_OPTIONS = [
  { value: 'SWAP', label: 'Swap / Trade (CGT Event)', color: 'bg-red-100 text-red-800' },
  { value: 'STAKING_REWARD', label: 'Staking Reward (Income)', color: 'bg-amber-100 text-amber-800' },
  { value: 'AIRDROP_STANDARD', label: 'Airdrop (Income)', color: 'bg-amber-100 text-amber-800' },
  { value: 'AIRDROP_INITIAL', label: 'Airdrop (Initial Allocation - Non-Taxable)', color: 'bg-green-100 text-green-800' },
  { value: 'LP_DEPOSIT', label: 'LP Deposit (CGT Event)', color: 'bg-red-100 text-red-800' },
  { value: 'LP_WITHDRAWAL', label: 'LP Withdrawal (CGT Event)', color: 'bg-red-100 text-red-800' },
  { value: 'NFT_SALE', label: 'NFT Sale (CGT Event)', color: 'bg-red-100 text-red-800' },
  { value: 'TRANSFER', label: 'Transfer (Non-Taxable)', color: 'bg-green-100 text-green-800' },
  { value: 'SPAM', label: 'Spam (Non-Taxable)', color: 'bg-gray-100 text-gray-800' },
  { value: 'OTHER_INCOME', label: 'Other Income', color: 'bg-amber-100 text-amber-800' },
  { value: 'NON_TAXABLE', label: 'Non-Taxable Event', color: 'bg-green-100 text-green-800' },
];

export function ReviewModal({
  transaction,
  isOpen,
  onClose,
  onSave,
}: ReviewModalProps) {
  const [selectedClassification, setSelectedClassification] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !transaction) return null;

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    if (!selectedClassification) return;

    setIsSaving(true);
    try {
      await onSave(transaction.id, selectedClassification);
      onClose();
    } catch (error) {
      console.error('Failed to save classification:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Review Transaction</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI classification needs manual verification
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Confidence Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  Low Confidence Classification
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  The AI is only {(transaction.aiConfidence || 0) * 100 | 0}% confident about this classification.
                  Please review and select the correct classification manually.
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Date:</span>
                  <span className="text-sm font-medium">{formatDate(transaction.block_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">AUD In:</span>
                  <span className="text-sm font-medium text-green-600">{formatAUD(transaction.audIn)}</span>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Description:</span>
                <p className="font-medium mt-1">{transaction.description}</p>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Signature:</span>
                <code className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {transaction.signature.slice(0, 20)}...{transaction.signature.slice(-20)}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          {transaction.aiExplanation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Explanation:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {transaction.aiExplanation}
                  </p>
                </div>
                {transaction.ato_rule && (
                  <div>
                    <p className="text-sm font-medium mb-1">ATO Rule:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.ato_rule}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Classification Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Classification</CardTitle>
              <CardDescription>
                Choose the correct classification for this transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {CLASSIFICATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedClassification(option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedClassification === option.value
                        ? 'border-[#064E3B] bg-[#064E3B]/10 ring-2 ring-[#064E3B]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{option.label}</span>
                      {selectedClassification === option.value && (
                        <CheckCircle className="h-4 w-4 text-[#064E3B]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedClassification || isSaving}
            className="bg-[#064E3B] hover:bg-[#065a45]"
          >
            {isSaving ? 'Saving...' : 'Save Classification'}
          </Button>
        </div>
      </div>
    </div>
  );
}

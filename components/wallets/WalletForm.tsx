// SolTax AU - Wallet Form Component
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isValidAddress } from '@/lib/utils/validators';

interface WalletFormProps {
  onSubmit: (data: { address: string; label?: string }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function WalletForm({ onSubmit, onCancel, isLoading }: WalletFormProps) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<{ address?: string; label?: string }>({});

  const validate = () => {
    const newErrors: { address?: string; label?: string } = {};

    if (!address) {
      newErrors.address = 'Wallet address is required';
    } else if (!isValidAddress(address)) {
      newErrors.address = 'Invalid Solana address';
    }

    if (label.length > 50) {
      newErrors.label = 'Label must be less than 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit({
        address: address.trim(),
        label: label.trim() || undefined,
      });

      // Reset form on success
      setAddress('');
      setLabel('');
    } catch (error) {
      // Error handled by parent
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Wallet Address"
        placeholder="Enter Solana wallet address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        error={errors.address}
        helperText="The Solana wallet address you want to track"
      />

      <Input
        label="Label (optional)"
        placeholder="e.g., Main Wallet, Trading, Cold Storage"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        error={errors.label}
        helperText="Give your wallet a recognizable name"
      />

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {isLoading ? 'Adding...' : 'Add Wallet'}
        </Button>
      </div>
    </form>
  );
}

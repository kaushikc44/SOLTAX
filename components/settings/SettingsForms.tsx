'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface SettingsFormProps {
  initial: {
    marginal_tax_rate: string | number;
    tax_resident_country: string;
    apply_medicare_levy: boolean;
    cgt_discount_eligible: boolean;
  };
}

export function TaxSettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [marginalRate, setMarginalRate] = useState(String(initial.marginal_tax_rate ?? '32.5'));
  const [country, setCountry] = useState(initial.tax_resident_country || 'AU');
  const [medicare, setMedicare] = useState(initial.apply_medicare_levy !== false);
  const [cgtDiscount, setCgtDiscount] = useState(initial.cgt_discount_eligible !== false);

  const handleSave = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marginal_tax_rate: parseFloat(marginalRate),
          tax_resident_country: country,
          apply_medicare_levy: medicare,
          cgt_discount_eligible: cgtDiscount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not save settings.');
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Marginal Tax Rate</label>
          <select
            value={marginalRate}
            onChange={(e) => setMarginalRate(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          >
            <option value="0">0%</option>
            <option value="19">19%</option>
            <option value="32.5">32.5%</option>
            <option value="37">37%</option>
            <option value="45">45%</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Tax Resident Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          >
            <option value="AU">Australia</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={medicare}
            onChange={(e) => setMedicare(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">Apply Medicare Levy (2%)</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={cgtDiscount}
            onChange={(e) => setCgtDiscount(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">Eligible for 50% CGT Discount</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Tax Settings'
          )}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

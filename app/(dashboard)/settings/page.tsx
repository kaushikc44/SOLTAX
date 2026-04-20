// SolTax AU - Settings Page
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserSettings } from '@/lib/db/queries';
import { getWallets } from '@/lib/db/queries';
import { User, Bell, Shield, CreditCard, Trash2 } from 'lucide-react';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/settings');
  }

  const settingsResult = await getUserSettings(user.id);
  const settings: any = settingsResult.data;

  const walletsResult = await getWallets(user.id);
  const wallets: any[] = walletsResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Email"
            value={user.email || ''}
            disabled
          />
          <Input
            label="Display Name"
            placeholder="Your name"
            defaultValue={user.user_metadata?.full_name}
          />
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Tax Settings</CardTitle>
          </div>
          <CardDescription>Configure your tax calculation preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Marginal Tax Rate
              </label>
              <select
                defaultValue={settings?.marginal_tax_rate || '32.5'}
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
              <label className="block text-sm font-medium mb-1.5">
                Tax Resident Country
              </label>
              <select
                defaultValue={settings?.tax_resident_country || 'AU'}
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
                defaultChecked={settings?.apply_medicare_levy !== false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Apply Medicare Levy (2%)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked={settings?.cgt_discount_eligible !== false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Eligible for 50% CGT Discount</span>
            </label>
          </div>

          <Button>Save Tax Settings</Button>
        </CardContent>
      </Card>

      {/* Connected Wallets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Connected Wallets</CardTitle>
          </div>
          <CardDescription>
            {wallets.length} wallet(s) connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wallets.length > 0 ? (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <p className="font-medium">{wallet.label || 'Wallet'}</p>
                    <p className="text-sm text-gray-500 font-mono">
                      {wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No wallets connected</p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">
                Delete all data
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Permanently remove all your wallets, transactions, and reports
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Data
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">
                Delete account
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

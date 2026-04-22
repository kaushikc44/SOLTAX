// SolTax AU - Settings Page
import { getCurrentUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserSettings } from '@/lib/db/queries';
import { getWallets } from '@/lib/db/queries';
import { User, Shield, CreditCard, Trash2 } from 'lucide-react';
import { TaxSettingsForm } from '@/components/settings/SettingsForms';

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
        <CardContent>
          <TaxSettingsForm
            initial={{
              marginal_tax_rate: settings?.marginal_tax_rate ?? 32.5,
              tax_resident_country: settings?.tax_resident_country ?? 'AU',
              apply_medicare_levy: settings?.apply_medicare_levy !== false,
              cgt_discount_eligible: settings?.cgt_discount_eligible !== false,
            }}
          />
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

// SolTax AU - Login Page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Key, CheckCircle, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Hard redirect on success
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const supabase = createClient();
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (magicLinkError) {
        setError(magicLinkError.message);
        return;
      }

      setSuccessMessage(`Check your email at ${email} - click the magic link to sign in!`);
      setEmail('');
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-aus-green-600 px-4 py-2 text-sm font-medium text-white shadow-md ring-1 ring-black/5 transition-all hover:bg-aus-green-700 hover:shadow-lg hover:-translate-y-0.5"
        >
          Try without account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo-dark.svg" alt="TaxMate" className="h-12 w-auto dark:hidden" />
            <img src="/logo.svg" alt="TaxMate" className="h-12 w-auto hidden dark:block" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to access your TaxMate dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          {/* Magic Link Form */}
          {!useMagicLink ? (
            <>
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !!successMessage}
                  autoComplete="email"
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || !!successMessage}
                  autoComplete="current-password"
                />
                <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!successMessage}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or use magic link</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUseMagicLink(true);
                  setError('');
                  setSuccessMessage('');
                }}
                disabled={isLoading || !!successMessage}
              >
                <Key className="mr-2 h-4 w-4" />
                Sign in with Magic Link
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !!successMessage}
                  autoComplete="email"
                />
                <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!successMessage}>
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or use password</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUseMagicLink(false);
                  setError('');
                  setSuccessMessage('');
                }}
                disabled={isLoading || !!successMessage}
              >
                <Lock className="mr-2 h-4 w-4" />
                Sign in with Password
              </Button>
            </>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-aus-green-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Just want to check a wallet?{' '}
            <Link href="/" className="underline hover:text-gray-900 dark:hover:text-white">
              Continue without account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

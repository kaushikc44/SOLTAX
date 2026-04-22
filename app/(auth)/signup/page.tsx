// SolTax AU - Sign Up Page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signUpWithEmail } from '@/lib/supabase/client';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const benefits = [
    'Free first tax report',
    'No credit card required',
    'ATO-compliant reports',
    'Secure data encryption',
  ];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { error: signUpError } = await signUpWithEmail(email, password);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Successful sign up - show success and redirect
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Benefits Side */}
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <div>
            <img
              src="/logo-dark.svg"
              alt="TaxMate"
              className="h-14 w-auto mb-6 dark:hidden"
            />
            <img
              src="/logo.svg"
              alt="TaxMate"
              className="h-14 w-auto mb-6 hidden dark:block"
            />
            <h1 className="text-3xl font-bold mb-2">
              Create your account
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generate your first ATO-compliant crypto tax report in minutes.
            </p>
          </div>

          <div className="space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-aus-green-600" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Side */}
        <Card>
          <CardHeader>
            <div className="lg:hidden flex justify-center mb-3">
              <img src="/logo-dark.svg" alt="TaxMate" className="h-10 w-auto dark:hidden" />
              <img src="/logo.svg" alt="TaxMate" className="h-10 w-auto hidden dark:block" />
            </div>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create your TaxMate account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                <strong>Account created!</strong> You will be redirected to login shortly...
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || success}
                autoComplete="email"
              />
              <Input
                type="password"
                label="Password"
                placeholder="Create a password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || success}
                autoComplete="new-password"
              />
              <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || success}
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full" isLoading={isLoading} disabled={success}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-aus-green-600 hover:underline font-medium">
                Sign in
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
    </div>
  );
}

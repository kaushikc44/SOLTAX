// SolTax AU - Sign Up Page
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signUpWithEmail } from '@/lib/supabase/client';
import { CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Benefits Side */}
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <div>
            <div className="h-12 w-12 rounded-lg bg-aus-green-600 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">S</span>
            </div>
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
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create your SolTax AU account
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

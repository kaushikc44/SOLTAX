// SolTax AU - Auth Callback Handler
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type'); // magiclink, signup, recovery, email_change
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');

  // Handle any auth errors
  if (error) {
    return NextResponse.redirect(new URL('/login?error=' + error, requestUrl.origin));
  }

  const supabase = await createClient();

  // token_hash flow — used by email-confirmation links when PKCE isn't set up
  // on the dashboard. verifyOtp creates the session.
  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (verifyError) {
      console.error('verifyOtp error:', verifyError);
      return NextResponse.redirect(new URL('/login?error=verify_failed', requestUrl.origin));
    }
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Auth callback error:', exchangeError);
      return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existingSettings) {
        await supabase.from('user_settings').insert({
          user_id: user.id,
          tax_resident_country: 'AU',
          marginal_tax_rate: 32.5,
          apply_medicare_levy: true,
          cgt_discount_eligible: true,
        } as any);
      }
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
}

// SolTax AU - Auth Callback Handler
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');

  // Handle any auth errors
  if (error) {
    return NextResponse.redirect(new URL('/login?error=' + error, requestUrl.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Auth callback error:', exchangeError);
      return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin));
    }

    // Successfully logged in - get user and create settings if needed
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Create default settings if not exists
      if (!existingSettings) {
        await supabase.from('user_settings').insert({
          user_id: user.id,
          tax_resident_country: 'AU',
          marginal_tax_rate: 32.5,
          apply_medicare_levy: true,
          cgt_discount_eligible: true,
        });
      }
    }

    // Redirect to the next page
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // No code - redirect to login
  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
}

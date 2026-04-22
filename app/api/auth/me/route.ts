// SolTax AU / TaxMate - API: whoami
// Lightweight endpoint for the landing page to learn whether the visitor is signed in.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, email: user.email },
  });
}

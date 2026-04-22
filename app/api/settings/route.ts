// SolTax AU / TaxMate - API: User settings CRUD
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient() as any;
  const { data } = await admin
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ settings: data ?? null });
}

const ALLOWED_FIELDS = [
  'marginal_tax_rate',
  'tax_resident_country',
  'apply_medicare_levy',
  'cgt_discount_eligible',
] as const;

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, any> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) patch[field] = body[field];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  const { data } = await admin
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  const existing = data as { id: string } | null;

  if (existing) {
    const { error } = await admin
      .from('user_settings')
      .update({ ...patch, updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from('user_settings')
      .insert({
        user_id: user.id,
        tax_resident_country: 'AU',
        marginal_tax_rate: 32.5,
        apply_medicare_levy: true,
        cgt_discount_eligible: true,
        ...patch,
      } as any);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { onboardingCanContinue, type OnboardingProfile } from '@/lib/onboarding';
import { supabaseServer } from '@/lib/supabase-server';

function validProfile(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as OnboardingProfile;
  return [1, 2, 3, 5].every((step) => onboardingCanContinue(step, profile));
}

export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const profile: unknown = await request.json().catch(() => null);
  if (!validProfile(profile)) return NextResponse.json({ error: 'Complete the required onboarding fields' }, { status: 400 });

  const { data: account } = await supabase.from('accounts').select('id').eq('owner_id', user.id).single();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const values = {
    account_id: account.id,
    name: profile.agentName.trim(), business_name: profile.businessName.trim(), address: profile.address.trim(),
    existing_phone: profile.existingPhone.trim() || null, industry: profile.industry.trim(), services: profile.services.trim(),
    opening_hours: profile.openingHours.trim(), greeting: profile.greeting.trim(), voice_id: profile.voiceId || null,
    language: profile.language, phone_mode: profile.phoneMode, carrier: profile.phoneMode === 'forward' ? profile.carrier : null,
    onboarding_step: 6,
  };
  const { data: existing } = await supabase.from('agents').select('id').eq('account_id', account.id).order('created_at').limit(1).maybeSingle();
  const operation = existing
    ? supabase.from('agents').update(values).eq('id', existing.id).select('id').single()
    : supabase.from('agents').insert(values).select('id').single();
  const { data, error } = await operation;
  if (error) return NextResponse.json({ error: 'Could not save your profile' }, { status: 500 });
  await supabase.from('accounts').update({ business_name: profile.businessName.trim() }).eq('id', account.id);
  return NextResponse.json({ agentId: data.id });
}

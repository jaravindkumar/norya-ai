import { NextResponse } from 'next/server';
import type { BusinessProfile } from '@/lib/elevenlabs';
import { ElevenLabsClient } from '@/lib/elevenlabs';
import { deferredPhoneNumberProvider } from '@/lib/phone-provider';
import { provisionAgent, type AgentPatch, type AgentRecord, type AgentRepository } from '@/lib/provisioning';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

function validProfile(value: unknown): value is BusinessProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return ['businessName', 'industry', 'services', 'openingHours', 'agentName', 'greeting']
    .every((key) => typeof profile[key] === 'string' && profile[key]!.toString().trim().length > 0);
}

function repository(): AgentRepository {
  const admin = supabaseAdmin();
  return {
    async getOrCreate(accountId, profile) {
      const { data: existing, error: readError } = await admin.from('agents').select('*')
        .eq('account_id', accountId).order('created_at').limit(1).maybeSingle();
      if (readError) throw readError;
      if (existing) return existing as AgentRecord;

      const { data, error } = await admin.from('agents').insert({
        account_id: accountId,
        name: profile.agentName,
        industry: profile.industry,
        services: profile.services,
        opening_hours: profile.openingHours,
        greeting: profile.greeting,
        voice_id: profile.voiceId,
      }).select('*').single();
      if (error) throw error;
      return data as AgentRecord;
    },
    async update(agentId: string, patch: AgentPatch) {
      const { data, error } = await admin.from('agents').update(patch).eq('id', agentId).select('*').single();
      if (error) throw error;
      return data as AgentRecord;
    },
  };
}

export async function POST(request: Request) {
  const server = supabaseServer();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const profile: unknown = await request.json().catch(() => null);
  if (!validProfile(profile)) return NextResponse.json({ error: 'A complete business profile is required' }, { status: 400 });

  const { data: account, error } = await server.from('accounts').select('id').eq('owner_id', user.id).single();
  if (error || !account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  if (!deferredPhoneNumberProvider.ready) {
    return NextResponse.json({
      error: 'Twilio setup pending',
      code: 'TWILIO_SETUP_PENDING',
      retryable: false,
    }, { status: 503 });
  }

  try {
    const agent = await provisionAgent({
      agents: repository(),
      agentProvider: new ElevenLabsClient(),
      phoneProvider: deferredPhoneNumberProvider,
    }, account.id, profile);
    return NextResponse.json({ agent });
  } catch (provisionError) {
    return NextResponse.json({
      error: provisionError instanceof Error ? provisionError.message : 'Provisioning failed',
      retryable: true,
    }, { status: 502 });
  }
}

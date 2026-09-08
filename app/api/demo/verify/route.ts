import { NextResponse } from 'next/server';
import { normalizeEmail, secureHash, verifyDemoCode } from '@/lib/demo-verification';
import { ElevenLabsClient } from '@/lib/elevenlabs';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { verificationId?: string; email?: string; code?: string } | null;
  if (!body?.verificationId || !body.email || !/^\d{6}$/.test(body.code ?? '')) return NextResponse.json({ error: 'Enter the six-digit code.' }, { status: 400 });
  const secret = process.env.DEMO_HASH_SECRET;
  if (!secret || secret.startsWith('replace-with-')) return NextResponse.json({ error: 'Demo verification is not configured.' }, { status: 503 });
  const admin = supabaseAdmin();
  const { data: record } = await admin.from('demo_verifications').select('*').eq('id', body.verificationId).maybeSingle();
  if (!record) return NextResponse.json({ error: 'Verification not found.' }, { status: 404 });
  const verdict = verifyDemoCode(record, body.email, body.code!, secret);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason === 'expired' ? 'This code has expired.' : verdict.reason === 'used' ? 'This code was already used.' : 'That code is not correct.' }, { status: 400 });

  const phoneHash = secureHash(record.phone, secret);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [phoneUsage, ipUsage] = await Promise.all([
    admin.from('demo_calls').select('id', { count: 'exact', head: true }).eq('phone_hash', phoneHash).gte('created_at', dayAgo),
    admin.from('demo_calls').select('id', { count: 'exact', head: true }).eq('ip_hash', record.ip_hash).gte('created_at', hourAgo),
  ]);
  if ((phoneUsage.count ?? 0) >= 1 || (ipUsage.count ?? 0) >= 3) {
    return NextResponse.json({ error: 'The free demo limit has been reached. Try again later.' }, { status: 429 });
  }

  if (!process.env.DEMO_AGENT_ID || process.env.DEMO_AGENT_ID === 'placeholder' || !process.env.DEMO_AGENT_PHONE_NUMBER_ID || process.env.DEMO_AGENT_PHONE_NUMBER_ID === 'placeholder') {
    return NextResponse.json({ error: 'Demo calling is awaiting the Twilio connection.', code: 'TWILIO_SETUP_PENDING' }, { status: 503 });
  }

  const usedAt = new Date().toISOString();
  const { data: claimed } = await admin.from('demo_verifications').update({ used_at: usedAt }).eq('id', record.id).is('used_at', null).select('id').maybeSingle();
  if (!claimed) return NextResponse.json({ error: 'This code was already used.' }, { status: 400 });

  try {
    const call = await new ElevenLabsClient().outboundCall({
      agentId: process.env.DEMO_AGENT_ID,
      agentPhoneNumberId: process.env.DEMO_AGENT_PHONE_NUMBER_ID,
      toNumber: record.phone,
    });
    await admin.from('demo_calls').insert({
      phone_hash: phoneHash,
      email_hash: secureHash(normalizeEmail(body.email), secret),
      ip_hash: record.ip_hash,
      verified_at: usedAt,
    });
    return NextResponse.json({ status: 'calling', conversationId: call.conversation_id });
  } catch {
    return NextResponse.json({ error: 'The call could not be placed. Please contact support.' }, { status: 502 });
  }
}

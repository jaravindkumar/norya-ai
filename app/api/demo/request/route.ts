import { NextResponse } from 'next/server';
import { sendDemoCode } from '@/lib/demo-email';
import { createDemoCode, DEMO_CODE_TTL_MS, demoRequestAllowed, normalizeEmail, normalizePhone, secureHash, validDemoIdentity } from '@/lib/demo-verification';
import { supabaseAdmin } from '@/lib/supabase-admin';

function clientIp(request: Request) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; phone?: string } | null;
  if (!body?.email || !body.phone || !validDemoIdentity(body.email, body.phone)) {
    return NextResponse.json({ error: 'Enter a valid email and international phone number.' }, { status: 400 });
  }
  const secret = process.env.DEMO_HASH_SECRET;
  if (!secret || secret.startsWith('replace-with-')) return NextResponse.json({ error: 'Demo verification is not configured.' }, { status: 503 });

  const admin = supabaseAdmin();
  const ipHash = secureHash(clientIp(request), secret);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin.from('demo_verifications').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
  if (countError) return NextResponse.json({ error: 'Could not check demo availability.' }, { status: 500 });
  if (!demoRequestAllowed(count ?? 0)) return NextResponse.json({ error: 'Too many demo requests. Try again later.' }, { status: 429 });

  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const code = createDemoCode();
  const { data, error } = await admin.from('demo_verifications').insert({
    email_hash: secureHash(email, secret), phone, code_hash: secureHash(`${email}:${code}`, secret), ip_hash: ipHash,
    expires_at: new Date(Date.now() + DEMO_CODE_TTL_MS).toISOString(),
  }).select('id').single();
  if (error) return NextResponse.json({ error: 'Could not create verification.' }, { status: 500 });

  try { await sendDemoCode(email, code); }
  catch { await admin.from('demo_verifications').delete().eq('id', data.id); return NextResponse.json({ error: 'Demo email delivery is not configured yet.' }, { status: 503 }); }
  return NextResponse.json({ verificationId: data.id, status: 'code_sent' });
}

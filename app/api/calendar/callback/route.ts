import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { encryptToken } from '@/lib/calendar';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase-server';

function verifyState(state: string, userId: string) {
  const [payload, signature] = state.split('.');
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!payload || !signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { userId?: string; expires?: number };
  return parsed.userId === userId && typeof parsed.expires === 'number' && parsed.expires > Date.now();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !verifyState(state, user.id)) return NextResponse.redirect(new URL('/onboarding?calendar=invalid-state', request.url));
  const callback = new URL('/api/calendar/callback', request.url).toString();
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', redirect_uri: callback, grant_type: 'authorization_code' }) });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL('/onboarding?calendar=connection-failed', request.url));
  const tokens = await tokenResponse.json() as { refresh_token?: string };
  if (!tokens.refresh_token) return NextResponse.redirect(new URL('/onboarding?calendar=no-refresh-token', request.url));
  const admin = supabaseAdmin();
  const { data: account } = await admin.from('accounts').select('id').eq('owner_id', user.id).single();
  if (!account) return NextResponse.redirect(new URL('/onboarding?calendar=account-missing', request.url));
  const { error } = await admin.from('calendar_connections').upsert({ account_id: account.id, provider: 'google', refresh_token_encrypted: encryptToken(tokens.refresh_token), connected_at: new Date().toISOString() }, { onConflict: 'account_id,provider' });
  return NextResponse.redirect(new URL(error ? '/onboarding?calendar=save-failed' : '/onboarding?calendar=connected', request.url));
}

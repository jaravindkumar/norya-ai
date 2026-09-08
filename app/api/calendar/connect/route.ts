import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/onboarding', request.url));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const stateSecret = process.env.OAUTH_STATE_SECRET;
  if (!clientId || !stateSecret || clientId === 'placeholder' || stateSecret === 'placeholder') {
    return NextResponse.redirect(new URL('/onboarding?calendar=not-configured', request.url));
  }
  const payload = Buffer.from(JSON.stringify({ userId: user.id, expires: Date.now() + 10 * 60_000 })).toString('base64url');
  const signature = createHmac('sha256', stateSecret).update(payload).digest('base64url');
  const callback = new URL('/api/calendar/callback', request.url).toString();
  const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.events', access_type: 'offline', prompt: 'consent', state: `${payload}.${signature}` }).toString();
  return NextResponse.redirect(authorize);
}

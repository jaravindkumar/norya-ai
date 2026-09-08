import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null) as { query?: unknown } | null;
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (query.length < 2) return NextResponse.json({ error: 'Enter a business name' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return NextResponse.json({ places: [], provider: 'unconfigured' });

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.regularOpeningHours',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
    const result = await response.json() as { places?: unknown[] };
    return NextResponse.json({ places: result.places ?? [], provider: 'google' });
  } catch {
    return NextResponse.json({ places: [], provider: 'unavailable' });
  }
}

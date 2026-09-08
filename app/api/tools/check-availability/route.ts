import { NextResponse } from 'next/server';
import { computeOpenSlots } from '@/lib/calendar';
import { calendarForAgent, validToolSecret } from '@/lib/calendar-tools';

export async function POST(request: Request) {
  if (!validToolSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { agentId?: string; date?: string; serviceDurationMinutes?: number } | null;
  if (!body?.agentId || !body.date || !Number.isInteger(body.serviceDurationMinutes)) return NextResponse.json({ error: 'Invalid availability request' }, { status: 400 });
  try {
    const { calendar } = await calendarForAgent(body.agentId);
    if (!calendar) return NextResponse.json({ available: false, fallback: 'The calendar is not connected. Offer to take a message.' });
    const timeMin = `${body.date}T00:00:00.000Z`; const timeMax = `${body.date}T23:59:59.999Z`;
    const result = await calendar.freeBusy(timeMin, timeMax);
    const slots = computeOpenSlots(body.date, result.calendars?.primary?.busy ?? [], body.serviceDurationMinutes!);
    return NextResponse.json({ available: slots.length > 0, slots, spokenSummary: slots.length ? slots.slice(0, 5).map((slot) => new Date(slot.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })).join(', ') : 'There are no suitable openings that day.' });
  } catch (error) {
    return NextResponse.json({ available: false, fallback: 'I cannot reach the calendar right now. Offer to take a message.', detail: error instanceof Error ? error.message : 'Calendar unavailable' });
  }
}

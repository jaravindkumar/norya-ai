import { NextResponse } from 'next/server';
import { slotIsFree } from '@/lib/calendar';
import { calendarForAgent, validToolSecret } from '@/lib/calendar-tools';

export async function POST(request: Request) {
  if (!validToolSecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { agentId?: string; date?: string; time?: string; durationMinutes?: number; customerName?: string; customerPhone?: string; conversationId?: string } | null;
  if (!body?.agentId || !body.date || !body.time || !Number.isInteger(body.durationMinutes) || !body.customerName || !body.customerPhone) return NextResponse.json({ error: 'Invalid booking request' }, { status: 400 });
  try {
    const { agent, calendar } = await calendarForAgent(body.agentId);
    if (!calendar) return NextResponse.json({ booked: false, fallback: 'The calendar is not connected. Offer to take a message.' });
    const start = `${body.date}T${body.time}:00.000Z`; const duration = body.durationMinutes!;
    const end = new Date(Date.parse(start) + duration * 60_000).toISOString();
    const fresh = await calendar.freeBusy(start, end);
    if (!slotIsFree(start, duration, fresh.calendars?.primary?.busy ?? [])) return NextResponse.json({ booked: false, reason: 'That time was just taken. Check availability again and offer another time.' }, { status: 409 });
    const event = await calendar.createEvent({ start, end, customerName: body.customerName, customerPhone: body.customerPhone });
    if (body.conversationId) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin');
      await supabaseAdmin().from('calls').update({ outcome: 'booked', data_fields: { calendar_event_id: event.id, customer_name: body.customerName, customer_phone: body.customerPhone } }).eq('conversation_id', body.conversationId).eq('account_id', agent.account_id);
    }
    return NextResponse.json({ booked: true, eventId: event.id, confirmation: `${body.customerName} is booked for ${body.date} at ${body.time}.` });
  } catch (error) {
    return NextResponse.json({ booked: false, fallback: 'I cannot complete the booking right now. Offer to take a message.', detail: error instanceof Error ? error.message : 'Calendar unavailable' });
  }
}

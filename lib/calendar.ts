import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type BusyPeriod = { start?: string | null; end?: string | null };
export type Slot = { start: string; end: string };

function key() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret || secret === 'placeholder') throw new Error('Calendar token encryption is not configured');
  return createHash('sha256').update(secret).digest();
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptToken(payload: string) {
  const [iv, tag, ciphertext] = payload.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !ciphertext) throw new Error('Invalid encrypted calendar token');
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function computeOpenSlots(date: string, busy: BusyPeriod[], durationMinutes: number, startHour = 9, endHour = 17): Slot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || durationMinutes < 5 || durationMinutes > 480) return [];
  const dayStart = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00.000Z`).getTime();
  const dayEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00.000Z`).getTime();
  const duration = durationMinutes * 60_000;
  const intervals = busy.flatMap((period) => {
    const start = period.start ? Date.parse(period.start) : NaN;
    const end = period.end ? Date.parse(period.end) : NaN;
    return Number.isFinite(start) && Number.isFinite(end) ? [{ start, end }] : [];
  });
  const slots: Slot[] = [];
  for (let start = dayStart; start + duration <= dayEnd; start += 30 * 60_000) {
    const end = start + duration;
    if (!intervals.some((busyPeriod) => start < busyPeriod.end && end > busyPeriod.start)) {
      slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return slots;
}

export function slotIsFree(start: string, durationMinutes: number, busy: BusyPeriod[]) {
  const from = Date.parse(start); const to = from + durationMinutes * 60_000;
  return Number.isFinite(from) && computeCollision(from, to, busy) === false;
}

function computeCollision(start: number, end: number, busy: BusyPeriod[]) {
  return busy.some((period) => {
    const busyStart = Date.parse(period.start ?? ''); const busyEnd = Date.parse(period.end ?? '');
    return Number.isFinite(busyStart) && Number.isFinite(busyEnd) && start < busyEnd && end > busyStart;
  });
}

export class GoogleCalendarClient {
  constructor(private readonly refreshToken: string) {}

  private async accessToken() {
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', refresh_token: this.refreshToken, grant_type: 'refresh_token' }) });
    if (!response.ok) throw new Error('Calendar connection needs to be renewed');
    const body = await response.json() as { access_token?: string };
    if (!body.access_token) throw new Error('Calendar connection needs to be renewed');
    return body.access_token;
  }

  private async request<T>(path: string, init: RequestInit) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, { ...init, headers: { ...init.headers, authorization: `Bearer ${await this.accessToken()}`, 'content-type': 'application/json' } });
    if (!response.ok) throw new Error(response.status === 401 ? 'Calendar connection needs to be renewed' : 'Google Calendar is temporarily unavailable');
    return response.json() as Promise<T>;
  }

  freeBusy(timeMin: string, timeMax: string) {
    return this.request<{ calendars?: { primary?: { busy?: BusyPeriod[] } } }>('/freeBusy', { method: 'POST', body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }) });
  }

  createEvent(input: { start: string; end: string; customerName: string; customerPhone: string }) {
    return this.request<{ id: string; htmlLink?: string }>('/calendars/primary/events', { method: 'POST', body: JSON.stringify({ summary: `Appointment — ${input.customerName}`, description: `Booked by Norya AI\nCustomer phone: ${input.customerPhone}`, start: { dateTime: input.start }, end: { dateTime: input.end } }) });
  }
}

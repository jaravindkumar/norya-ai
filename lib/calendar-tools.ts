import { decryptToken, GoogleCalendarClient } from './calendar';
import { supabaseAdmin } from './supabase-admin';

export async function calendarForAgent(elevenlabsAgentId: string) {
  const admin = supabaseAdmin();
  const { data: agent } = await admin.from('agents').select('id,account_id,opening_hours').eq('elevenlabs_agent_id', elevenlabsAgentId).maybeSingle();
  if (!agent) throw new Error('Agent not found');
  const { data: connection } = await admin.from('calendar_connections').select('refresh_token_encrypted').eq('account_id', agent.account_id).eq('provider', 'google').maybeSingle();
  if (!connection) return { agent, calendar: null };
  return { agent, calendar: new GoogleCalendarClient(decryptToken(connection.refresh_token_encrypted)) };
}

export function validToolSecret(request: Request) {
  const expected = process.env.ELEVENLABS_TOOL_SECRET;
  return Boolean(expected && expected !== 'placeholder' && request.headers.get('x-norya-tool-secret') === expected);
}

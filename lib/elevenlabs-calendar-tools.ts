type JsonSchema = { type: 'object'; properties: Record<string, { type: 'string' | 'integer'; description: string }>; required: string[] };

const field = (type: 'string' | 'integer', description: string) => ({ type, description });

export function calendarToolConfigs(baseUrl: string, secret: string) {
  const webhook = (name: string, description: string, parameters: JsonSchema) => ({
    tool_config: {
      type: 'webhook', name, description,
      api_schema: { url: `${baseUrl}/api/tools/${name.replaceAll('_', '-')}`, method: 'POST', request_body_schema: parameters, request_headers: { 'x-norya-tool-secret': secret } },
      response_timeout_secs: 12,
    },
  });
  return [
    webhook('check_availability', 'Use before offering any appointment time. Checks the connected calendar for real openings on a date. If unavailable, offer to take a message.', { type: 'object', properties: { agentId: field('string', 'The current ElevenLabs agent ID'), date: field('string', 'Date in YYYY-MM-DD format'), serviceDurationMinutes: field('integer', 'Required appointment length in minutes') }, required: ['agentId', 'date', 'serviceDurationMinutes'] }),
    webhook('book_appointment', 'Use only after the caller chooses a time. Re-checks that exact slot and books it. If it was taken, check availability again.', { type: 'object', properties: { agentId: field('string', 'The current ElevenLabs agent ID'), date: field('string', 'Date in YYYY-MM-DD format'), time: field('string', 'Time in HH:mm 24-hour format'), durationMinutes: field('integer', 'Appointment length in minutes'), customerName: field('string', 'Customer full name'), customerPhone: field('string', 'Customer phone number'), conversationId: field('string', 'Current conversation ID') }, required: ['agentId', 'date', 'time', 'durationMinutes', 'customerName', 'customerPhone'] }),
  ];
}

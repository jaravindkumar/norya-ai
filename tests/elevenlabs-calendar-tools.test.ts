import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarToolConfigs } from '../lib/elevenlabs-calendar-tools';

test('calendar tools have explicit sequencing and authenticated HTTPS webhooks', () => {
  const tools = calendarToolConfigs('https://norya.example', 'secret');
  assert.equal(tools.length, 2);
  assert.match(tools[0].tool_config.description, /before offering any appointment time/i);
  assert.equal(tools[0].tool_config.api_schema.url, 'https://norya.example/api/tools/check-availability');
  assert.equal(tools[1].tool_config.api_schema.request_headers['x-norya-tool-secret'], 'secret');
});

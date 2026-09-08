import assert from 'node:assert/strict';
import test from 'node:test';
import { computeOpenSlots, slotIsFree } from '../lib/calendar';

test('availability excludes a blocked hour', () => {
  const slots = computeOpenSlots('2026-09-09', [{ start: '2026-09-09T10:00:00Z', end: '2026-09-09T11:00:00Z' }], 60);
  assert.equal(slots.some((slot) => slot.start === '2026-09-09T10:00:00.000Z'), false);
  assert.equal(slots.some((slot) => slot.start === '2026-09-09T11:00:00.000Z'), true);
});

test('booking re-check detects a newly occupied slot', () => {
  assert.equal(slotIsFree('2026-09-09T14:00:00Z', 30, []), true);
  assert.equal(slotIsFree('2026-09-09T14:00:00Z', 30, [{ start: '2026-09-09T14:00:00Z', end: '2026-09-09T14:30:00Z' }]), false);
});

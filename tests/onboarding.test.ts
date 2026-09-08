import assert from 'node:assert/strict';
import test from 'node:test';
import { forwardingCode, onboardingCanContinue, type OnboardingProfile } from '../lib/onboarding';

const profile: OnboardingProfile = {
  businessName: 'Norya Salon', address: '1 High Street', existingPhone: '020 7000 0000',
  industry: 'Hair salon', services: 'Cut £30', openingHours: 'Mon–Fri 09:00–17:00',
  agentName: 'Nora', greeting: 'Hello, how can I help?', voiceId: 'rachel', language: 'en-GB',
  phoneMode: 'forward', carrier: 'BT',
};

test('required onboarding steps reject missing business details', () => {
  assert.equal(onboardingCanContinue(1, { ...profile, address: '' }), false);
  assert.equal(onboardingCanContinue(1, profile), true);
  assert.equal(onboardingCanContinue(4, profile), true);
});

test('forwarding codes vary by supported carrier', () => {
  assert.equal(forwardingCode('BT', '02070000000'), '*21*02070000000#');
  assert.equal(forwardingCode('Vodafone', '02070000000'), '**21*02070000000#');
});

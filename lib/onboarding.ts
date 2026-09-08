export const FORWARDING_CODES = {
  BT: '*21*{number}#',
  EE: '**21*{number}#',
  Vodafone: '**21*{number}#',
  Three: '**21*{number}#',
  Virgin: '*21*{number}#',
  Sky: '*21*{number}#',
} as const;

export type Carrier = keyof typeof FORWARDING_CODES;

export type OnboardingProfile = {
  businessName: string;
  address: string;
  existingPhone: string;
  industry: string;
  services: string;
  openingHours: string;
  agentName: string;
  greeting: string;
  voiceId: string;
  language: string;
  phoneMode: 'dedicated' | 'forward';
  carrier: Carrier;
};

export function onboardingCanContinue(step: number, profile: OnboardingProfile) {
  if (step === 1) return Boolean(profile.businessName.trim() && profile.address.trim());
  if (step === 2) return Boolean(profile.industry.trim() && profile.services.trim() && profile.openingHours.trim());
  if (step === 3) return Boolean(profile.agentName.trim() && profile.greeting.trim() && profile.language);
  if (step === 5) return profile.phoneMode === 'dedicated' || Boolean(profile.existingPhone.trim() && profile.carrier);
  return true;
}

export function forwardingCode(carrier: Carrier, number: string) {
  return FORWARDING_CODES[carrier].replace('{number}', number || 'YOUR_NORYA_NUMBER');
}

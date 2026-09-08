import 'server-only';

export type ClaimedNumber = { e164: string; twilioSid: string };

export interface PhoneNumberProvider {
  readonly ready: boolean;
  claimNumber(accountId: string): Promise<ClaimedNumber>;
}

export class TwilioSetupPendingError extends Error {
  readonly code = 'TWILIO_SETUP_PENDING';

  constructor() {
    super('Twilio compliance approval and number-pool setup are still pending.');
  }
}

export const deferredPhoneNumberProvider: PhoneNumberProvider = {
  ready: false,
  async claimNumber() {
    throw new TwilioSetupPendingError();
  },
};

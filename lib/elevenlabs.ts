import 'server-only';
import { buildPrompt } from './agent-prompt';

export { buildPrompt } from './agent-prompt';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export type BusinessProfile = {
  businessName: string;
  industry: string;
  services: string;
  openingHours: string;
  extra?: string;
  agentName: string;
  greeting: string;
  voiceId?: string;
};

type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

export class ElevenLabsClient {
  constructor(private readonly apiKey = process.env.ELEVENLABS_API_KEY) {
    if (!apiKey || apiKey === 'placeholder') throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'xi-api-key': this.apiKey!,
        'content-type': 'application/json',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ElevenLabs request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    return response.json() as Promise<T>;
  }

  createAgent(profile: BusinessProfile) {
    return this.request<{ agent_id: string }>('/convai/agents/create', {
      method: 'POST',
      body: {
        name: profile.agentName,
        conversation_config: {
          agent: { prompt: { prompt: buildPrompt(profile) }, first_message: profile.greeting },
          tts: profile.voiceId ? { voice_id: profile.voiceId } : undefined,
        },
      },
    });
  }

  updateAgent(agentId: string, profile: BusinessProfile) {
    return this.request<void>(`/convai/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH',
      body: {
        name: profile.agentName,
        conversation_config: {
          agent: { prompt: { prompt: buildPrompt(profile) }, first_message: profile.greeting },
          tts: profile.voiceId ? { voice_id: profile.voiceId } : undefined,
        },
      },
    });
  }

  createTool(tool: unknown) {
    return this.request<{ id: string }>('/convai/tools', { method: 'POST', body: tool });
  }

  attachTools(agentId: string, toolIds: string[]) {
    return this.request<void>(`/convai/agents/${encodeURIComponent(agentId)}`, {
      method: 'PATCH', body: { conversation_config: { agent: { prompt: { tool_ids: toolIds } } } },
    });
  }

  importPhoneNumber(input: { phoneNumber: string; agentId: string; label: string }) {
    return this.request<{ phone_number_id: string }>('/convai/phone-numbers', {
      method: 'POST',
      body: {
        phone_number: input.phoneNumber,
        agent_id: input.agentId,
        label: input.label,
        provider: 'twilio',
        sid: process.env.TWILIO_ACCOUNT_SID,
        token: process.env.TWILIO_AUTH_TOKEN,
      },
    });
  }

  outboundCall(input: { agentId: string; agentPhoneNumberId: string; toNumber: string }) {
    return this.request<{ success: boolean; message?: string; conversation_id?: string }>('/convai/twilio/outbound-call', {
      method: 'POST',
      body: {
        agent_id: input.agentId,
        agent_phone_number_id: input.agentPhoneNumberId,
        to_number: input.toNumber,
      },
    });
  }

  getSignedUrl(agentId: string) {
    return this.request<{ signed_url: string }>(`/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
  }
}

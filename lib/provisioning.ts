import type { BusinessProfile } from './elevenlabs';
import type { PhoneNumberProvider } from './phone-provider';

export type ProvisioningState = 'pending' | 'agent_created' | 'number_claimed' | 'number_imported' | 'live' | 'failed';

export type AgentRecord = {
  id: string;
  account_id: string;
  provisioning_state: ProvisioningState;
  elevenlabs_agent_id: string | null;
  phone_number_id: string | null;
  phone_number: string | null;
  last_error: string | null;
};

export type AgentPatch = Partial<Pick<AgentRecord,
  'provisioning_state' | 'elevenlabs_agent_id' | 'phone_number_id' | 'phone_number' | 'last_error'>>;

export interface AgentRepository {
  getOrCreate(accountId: string, profile: BusinessProfile): Promise<AgentRecord>;
  update(agentId: string, patch: AgentPatch): Promise<AgentRecord>;
}

export interface AgentProvider {
  createAgent(profile: BusinessProfile): Promise<{ agent_id: string }>;
  importPhoneNumber(input: { phoneNumber: string; agentId: string; label: string }): Promise<{ phone_number_id: string }>;
}

export type ProvisioningDependencies = {
  agents: AgentRepository;
  agentProvider: AgentProvider;
  phoneProvider: PhoneNumberProvider;
};

function resumeState(agent: AgentRecord): ProvisioningState {
  if (agent.provisioning_state !== 'failed') return agent.provisioning_state;
  if (agent.phone_number_id) return 'number_imported';
  if (agent.phone_number) return 'number_claimed';
  if (agent.elevenlabs_agent_id) return 'agent_created';
  return 'pending';
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown provisioning error';
}

export async function provisionAgent(deps: ProvisioningDependencies, accountId: string, profile: BusinessProfile) {
  let agent = await deps.agents.getOrCreate(accountId, profile);

  try {
    const resumed = resumeState(agent);
    if (resumed !== agent.provisioning_state) {
      agent = await deps.agents.update(agent.id, { provisioning_state: resumed, last_error: null });
    }

    if (agent.provisioning_state === 'pending') {
      const created = await deps.agentProvider.createAgent(profile);
      agent = await deps.agents.update(agent.id, {
        elevenlabs_agent_id: created.agent_id,
        provisioning_state: 'agent_created',
        last_error: null,
      });
    }

    if (agent.provisioning_state === 'agent_created') {
      const claimed = await deps.phoneProvider.claimNumber(accountId);
      agent = await deps.agents.update(agent.id, {
        phone_number: claimed.e164,
        provisioning_state: 'number_claimed',
        last_error: null,
      });
    }

    if (agent.provisioning_state === 'number_claimed') {
      if (!agent.phone_number || !agent.elevenlabs_agent_id) throw new Error('Provisioning state is missing provider identifiers');
      const imported = await deps.agentProvider.importPhoneNumber({
        phoneNumber: agent.phone_number,
        agentId: agent.elevenlabs_agent_id,
        label: profile.businessName,
      });
      agent = await deps.agents.update(agent.id, {
        phone_number_id: imported.phone_number_id,
        provisioning_state: 'number_imported',
        last_error: null,
      });
    }

    if (agent.provisioning_state === 'number_imported') {
      agent = await deps.agents.update(agent.id, { provisioning_state: 'live', last_error: null });
    }

    return agent;
  } catch (error) {
    await deps.agents.update(agent.id, { provisioning_state: 'failed', last_error: errorMessage(error) });
    throw error;
  }
}

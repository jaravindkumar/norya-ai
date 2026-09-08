import assert from 'node:assert/strict';
import test from 'node:test';
import type { BusinessProfile } from '../lib/elevenlabs';
import { provisionAgent, type AgentPatch, type AgentRecord, type AgentRepository } from '../lib/provisioning';

const profile: BusinessProfile = {
  businessName: 'Norya Test Salon',
  industry: 'hair salon',
  services: 'Cut £30; colour £75',
  openingHours: 'Monday to Friday, 09:00–17:00',
  agentName: 'Nora',
  greeting: 'Hello, Norya Test Salon. How can I help?',
};

class MemoryRepository implements AgentRepository {
  record: AgentRecord = {
    id: 'agent-row-1', account_id: 'account-1', provisioning_state: 'pending',
    elevenlabs_agent_id: null, phone_number_id: null, phone_number: null, last_error: null,
  };

  async getOrCreate() { return { ...this.record }; }
  async update(_agentId: string, patch: AgentPatch) {
    this.record = { ...this.record, ...patch };
    return { ...this.record };
  }
}

test('provisions once and reaches live', async () => {
  const agents = new MemoryRepository();
  let creates = 0;
  let claims = 0;
  let imports = 0;
  const result = await provisionAgent({
    agents,
    agentProvider: {
      async createAgent() { creates += 1; return { agent_id: 'el-agent-1' }; },
      async importPhoneNumber() { imports += 1; return { phone_number_id: 'el-phone-1' }; },
    },
    phoneProvider: {
      ready: true,
      async claimNumber() { claims += 1; return { e164: '+442000000001', twilioSid: 'PN1' }; },
    },
  }, 'account-1', profile);

  assert.equal(result.provisioning_state, 'live');
  assert.deepEqual({ creates, claims, imports }, { creates: 1, claims: 1, imports: 1 });
});

test('resumes after import failure without creating or claiming twice', async () => {
  const agents = new MemoryRepository();
  let creates = 0;
  let claims = 0;
  let imports = 0;
  let failImport = true;
  const dependencies = {
    agents,
    agentProvider: {
      async createAgent() { creates += 1; return { agent_id: 'el-agent-1' }; },
      async importPhoneNumber() {
        imports += 1;
        if (failImport) throw new Error('simulated process interruption');
        return { phone_number_id: 'el-phone-1' };
      },
    },
    phoneProvider: {
      ready: true,
      async claimNumber() { claims += 1; return { e164: '+442000000001', twilioSid: 'PN1' }; },
    },
  };

  await assert.rejects(() => provisionAgent(dependencies, 'account-1', profile), /interruption/);
  assert.equal(agents.record.provisioning_state, 'failed');
  assert.equal(agents.record.phone_number, '+442000000001');

  failImport = false;
  const result = await provisionAgent(dependencies, 'account-1', profile);
  assert.equal(result.provisioning_state, 'live');
  assert.deepEqual({ creates, claims, imports }, { creates: 1, claims: 1, imports: 2 });
});

test('empty pool records a clear failed state', async () => {
  const agents = new MemoryRepository();
  await assert.rejects(() => provisionAgent({
    agents,
    agentProvider: {
      async createAgent() { return { agent_id: 'el-agent-1' }; },
      async importPhoneNumber() { return { phone_number_id: 'never' }; },
    },
    phoneProvider: {
      ready: true,
      async claimNumber() { throw new Error('No phone numbers are available'); },
    },
  }, 'account-1', profile), /No phone numbers/);

  assert.equal(agents.record.provisioning_state, 'failed');
  assert.equal(agents.record.last_error, 'No phone numbers are available');
  assert.equal(agents.record.elevenlabs_agent_id, 'el-agent-1');
});
